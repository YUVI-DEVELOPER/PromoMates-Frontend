import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Extension, Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import type { Mark } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";

import { uploadDocumentAsset } from "../../api/assets";
import {
  autosaveContentWorkspaceEditor,
  createContentWorkspaceDraftVersionFromEditor,
  getContentWorkspaceEditor,
} from "../../api/contentVersions";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import type { Asset } from "../../types/asset";
import type { ContentRequestReferenceMaterial, TherapyAlignmentCommentSummary } from "../../types/materialRequest";
import type { ContentWorkspaceEditorDetail } from "../../types/contentVersion";
import { contentAuthoringModeLabels } from "../../types/contentVersion";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/fileSize";


const primaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md bg-brand-700 px-3 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const toolbarButtonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

const activeToolbarButtonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-2 text-xs font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40";

const draftVersionAllowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const draftVersionAllowedExtensions = [".pdf", ".docx", ".pptx"];
const imageAllowedMimeTypes = new Set(["image/jpeg", "image/png"]);
const paintPalette = ["#0f172a", "#dc2626", "#2563eb", "#047857", "#f59e0b", "#ffffff"];
const fillPalette = ["#ffffff", "#fee2e2", "#dbeafe", "#dcfce7", "#fef3c7", "#e0f2fe"];
const editablePaintNodeTypes = ["shapeBlock", "imageBlock", "calloutBlock", "noteBlock", "paragraph", "heading", "tableCell", "tableHeader"];
const therapyAlignmentStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};
const therapyAlignmentTopicLabels: Record<string, string> = {
  KEY_MESSAGES: "Key Messages",
  POSITIONING: "Positioning",
  TARGET_AUDIENCE: "Target Audience",
  LOCAL_REQUIREMENTS: "Local Requirements",
  REFERENCE_MATERIALS: "Reference Materials",
  CLAIMS: "Claims",
  OTHER: "Other",
};

type TextCaseMode = "upper" | "lower" | "title" | "sentence" | "swap";

const anchorableNodeTypes = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "calloutBlock",
  "claimReferenceBlock",
  "imageBlock",
  "shapeBlock",
  "designGroupBlock",
  "noteBlock",
];

// Future: these stable block ids are the attachment points for Yjs/WebSocket
// collaboration, presence cursors, anchored comments, track changes, and version comparison.

function createStableId(prefix = "block"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}


const BlockIdExtension = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: anchorableNodeTypes,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) => {
              if (!attributes.blockId) {
                return {};
              }
              return { "data-block-id": attributes.blockId };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("authoring-block-id"),
        appendTransaction: (_transactions, _oldState, newState) => {
          const tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node, position) => {
            if (anchorableNodeTypes.includes(node.type.name) && !node.attrs.blockId) {
              tr.setNodeMarkup(position, undefined, {
                ...node.attrs,
                blockId: createStableId(),
              });
              changed = true;
            }
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});


const CalloutBlock = Node.create({
  name: "calloutBlock",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "rectangle",
        parseHTML: (element) => element.getAttribute("data-callout-variant") ?? "rectangle",
        renderHTML: (attributes) => ({ "data-callout-variant": attributes.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-node-type='callout-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "callout-block",
        class: `authoring-callout authoring-callout-${HTMLAttributes.variant ?? "rectangle"}`,
      }),
      0,
    ];
  },
});


const NoteBlock = Node.create({
  name: "noteBlock",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "aside[data-node-type='note-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "note-block",
        class: "authoring-note-block",
      }),
      0,
    ];
  },
});

const PaintStyleExtension = Extension.create({
  name: "paintStyle",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "calloutBlock", "noteBlock", "tableCell", "tableHeader"],
        attributes: {
          textColor: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-text-color") ?? null,
            renderHTML: (attributes) =>
              attributes.textColor
                ? { "data-text-color": attributes.textColor, style: `color: ${attributes.textColor};` }
                : {},
          },
          fillColor: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-fill-color") ?? null,
            renderHTML: (attributes) =>
              attributes.fillColor
                ? { "data-fill-color": attributes.fillColor, style: `background-color: ${attributes.fillColor};` }
                : {},
          },
        },
      },
    ];
  },
});


const ClaimReferenceBlock = Node.create({
  name: "claimReferenceBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      claimText: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-claim-text") ?? "",
        renderHTML: (attributes) => ({ "data-claim-text": attributes.claimText }),
      },
      referenceNote: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-reference-note") ?? "",
        renderHTML: (attributes) => ({ "data-reference-note": attributes.referenceNote }),
      },
      linkedReferenceId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-linked-reference-id"),
        renderHTML: (attributes) =>
          attributes.linkedReferenceId ? { "data-linked-reference-id": attributes.linkedReferenceId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-node-type='claim-reference-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "claim-reference-block",
        class: "authoring-claim-reference-block",
      }),
      ["p", { class: "authoring-claim-label" }, "Claim / Reference Block"],
      ["p", { class: "authoring-claim-text" }, HTMLAttributes.claimText || ""],
      ["p", { class: "authoring-reference-note" }, HTMLAttributes.referenceNote || ""],
    ];
  },
});


const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.querySelector("img")?.getAttribute("src") ?? null,
      },
      alt: {
        default: "",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("alt") ?? "",
      },
      caption: {
        default: "",
        parseHTML: (element) => element.querySelector("figcaption")?.textContent ?? "",
      },
      width: {
        default: "100%",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-width") ?? "100%",
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") ?? "center",
      },
      aspectRatio: {
        default: "auto",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-aspect-ratio") ?? "auto",
      },
      objectFit: {
        default: "contain",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-object-fit") ?? "contain",
      },
      objectPositionX: {
        default: "50",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-object-position-x") ?? "50",
      },
      objectPositionY: {
        default: "50",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-object-position-y") ?? "50",
      },
      rotation: {
        default: "0",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-rotation") ?? "0",
      },
      opacity: {
        default: "100",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-opacity") ?? "100",
      },
      borderRadius: {
        default: "0",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-border-radius") ?? "0",
      },
      borderColor: {
        default: "#e2e8f0",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-border-color") ?? "#e2e8f0",
      },
      shadow: {
        default: "none",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("data-shadow") ?? "none",
      },
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-asset-id"),
        renderHTML: (attributes) => (attributes.assetId ? { "data-asset-id": attributes.assetId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-node-type='image-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const width = String(HTMLAttributes.width ?? "100%");
    const align = String(HTMLAttributes.align ?? "center");
    const aspectRatio = String(HTMLAttributes.aspectRatio ?? "auto");
    const objectFit = String(HTMLAttributes.objectFit ?? "contain");
    const objectPositionX = String(HTMLAttributes.objectPositionX ?? "50");
    const objectPositionY = String(HTMLAttributes.objectPositionY ?? "50");
    const rotation = String(HTMLAttributes.rotation ?? "0");
    const opacity = Number(HTMLAttributes.opacity ?? 100) / 100;
    const borderRadius = String(HTMLAttributes.borderRadius ?? "0");
    const borderColor = String(HTMLAttributes.borderColor ?? "#e2e8f0");
    const shadow = String(HTMLAttributes.shadow ?? "none");
    const shadowValue = shadow === "soft" ? "0 12px 28px rgba(15, 23, 42, 0.16)" : "none";
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "image-block",
        "data-align": align,
        class: "authoring-image-block",
        style: `text-align: ${align};`,
      }),
      [
        "img",
        {
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt ?? "",
          "data-width": width,
          "data-aspect-ratio": aspectRatio,
          "data-object-fit": objectFit,
          "data-object-position-x": objectPositionX,
          "data-object-position-y": objectPositionY,
          "data-rotation": rotation,
          "data-opacity": HTMLAttributes.opacity ?? "100",
          "data-border-radius": borderRadius,
          "data-border-color": borderColor,
          "data-shadow": shadow,
          style: [
            `width: ${width}`,
            aspectRatio !== "auto" ? `aspect-ratio: ${aspectRatio}` : "",
            `object-fit: ${objectFit}`,
            `object-position: ${objectPositionX}% ${objectPositionY}%`,
            `transform: rotate(${rotation}deg)`,
            `opacity: ${opacity}`,
            `border-radius: ${borderRadius}px`,
            `border-color: ${borderColor}`,
            `box-shadow: ${shadowValue}`,
          ]
            .filter(Boolean)
            .join("; "),
        },
      ],
      ["figcaption", {}, HTMLAttributes.caption ?? ""],
    ];
  },
});

const ShapeBlock = Node.create({
  name: "shapeBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      shapeType: {
        default: "rectangle",
        parseHTML: (element) => element.getAttribute("data-shape-type") ?? "rectangle",
      },
      text: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-shape-text") ?? "",
      },
      width: {
        default: "220",
        parseHTML: (element) => element.getAttribute("data-width") ?? "220",
      },
      height: {
        default: "120",
        parseHTML: (element) => element.getAttribute("data-height") ?? "120",
      },
      fillColor: {
        default: "#e0f2fe",
        parseHTML: (element) => element.getAttribute("data-fill-color") ?? "#e0f2fe",
      },
      strokeColor: {
        default: "#0284c7",
        parseHTML: (element) => element.getAttribute("data-stroke-color") ?? "#0284c7",
      },
      textColor: {
        default: "#0f172a",
        parseHTML: (element) => element.getAttribute("data-text-color") ?? "#0f172a",
      },
      rotation: {
        default: "0",
        parseHTML: (element) => element.getAttribute("data-rotation") ?? "0",
      },
      opacity: {
        default: "100",
        parseHTML: (element) => element.getAttribute("data-opacity") ?? "100",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-node-type='shape-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const shapeType = String(HTMLAttributes.shapeType ?? "rectangle");
    const width = String(HTMLAttributes.width ?? "220");
    const height = String(HTMLAttributes.height ?? "120");
    const fillColor = String(HTMLAttributes.fillColor ?? "#e0f2fe");
    const strokeColor = String(HTMLAttributes.strokeColor ?? "#0284c7");
    const textColor = String(HTMLAttributes.textColor ?? "#0f172a");
    const rotation = String(HTMLAttributes.rotation ?? "0");
    const opacity = Number(HTMLAttributes.opacity ?? 100) / 100;
    const clipPath = shapeType === "triangle" ? "clip-path: polygon(50% 0, 100% 100%, 0 100%);" : "";
    const radius = shapeType === "ellipse" ? "9999px" : shapeType === "rounded" ? "18px" : "2px";
    const lineStyles = shapeType === "line" ? "height: 6px; min-height: 6px; padding: 0;" : "";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "shape-block",
        "data-shape-type": shapeType,
        "data-shape-text": HTMLAttributes.text ?? "",
        "data-width": width,
        "data-height": height,
        "data-fill-color": fillColor,
        "data-stroke-color": strokeColor,
        "data-text-color": textColor,
        "data-rotation": rotation,
        "data-opacity": HTMLAttributes.opacity ?? "100",
        class: `authoring-shape-block authoring-shape-${shapeType}`,
        style: [
          `width: ${width}px`,
          `min-height: ${height}px`,
          `background: ${shapeType === "line" ? strokeColor : fillColor}`,
          `border-color: ${strokeColor}`,
          `color: ${textColor}`,
          `border-radius: ${radius}`,
          `transform: rotate(${rotation}deg)`,
          `opacity: ${opacity}`,
          clipPath,
          lineStyles,
        ]
          .filter(Boolean)
          .join("; "),
      }),
      HTMLAttributes.text ?? "",
    ];
  },
});

const DesignGroupBlock = Node.create({
  name: "designGroupBlock",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "section[data-node-type='design-group-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "design-group-block",
        class: "authoring-design-group-block",
      }),
      0,
    ];
  },
});


const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Underline,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  LinkExtension.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: {
      class: "text-brand-700 underline",
    },
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  CalloutBlock,
  ClaimReferenceBlock,
  ImageBlock,
  ShapeBlock,
  DesignGroupBlock,
  NoteBlock,
  PaintStyleExtension,
  BlockIdExtension,
];


function emptyDocument(): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { blockId: createStableId() },
      },
    ],
  };
}


function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not saved";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function formatSavedTime(value?: string | null): string {
  if (!value) {
    return "Not saved";
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}


function resolveInitialContent(detail: ContentWorkspaceEditorDetail | null): JSONContent {
  const autosaveJson = detail?.latest_autosave?.content_json;
  if (autosaveJson) {
    return autosaveJson as JSONContent;
  }
  const versionJson = detail?.current_draft_version?.content_json;
  if (versionJson) {
    return versionJson as JSONContent;
  }
  return emptyDocument();
}


function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}


function validateDraftVersionFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!draftVersionAllowedMimeTypes.has(file.type) && !draftVersionAllowedExtensions.includes(extension)) {
    return "Unsupported file type. Upload a DOCX, PPTX, or PDF file.";
  }
  if (file.size <= 0) {
    return "Uploaded file must not be empty.";
  }
  if (file.size > 50 * 1024 * 1024) {
    return "Uploaded file exceeds the 50 MB limit.";
  }
  return null;
}


function normalizePlainText(editor: Editor): string {
  return editor.getText({ blockSeparator: "\n" }).trim();
}

function isCasedLetter(value: string): boolean {
  return value.toLocaleLowerCase() !== value.toLocaleUpperCase();
}

function toTitleCase(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[A-Za-z][A-Za-z']*/g, (word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`);
}

function toSentenceCase(value: string): string {
  let shouldCapitalize = true;
  return Array.from(value.toLocaleLowerCase())
    .map((character) => {
      if (isCasedLetter(character)) {
        const nextCharacter = shouldCapitalize ? character.toLocaleUpperCase() : character;
        shouldCapitalize = false;
        return nextCharacter;
      }
      if (/[.!?]/.test(character)) {
        shouldCapitalize = true;
      }
      return character;
    })
    .join("");
}

function toSwapCase(value: string): string {
  return Array.from(value)
    .map((character) => {
      if (!isCasedLetter(character)) {
        return character;
      }
      return character === character.toLocaleUpperCase() ? character.toLocaleLowerCase() : character.toLocaleUpperCase();
    })
    .join("");
}

function transformTextCase(value: string, mode: TextCaseMode): string {
  switch (mode) {
    case "upper":
      return value.toLocaleUpperCase();
    case "lower":
      return value.toLocaleLowerCase();
    case "title":
      return toTitleCase(value);
    case "sentence":
      return toSentenceCase(value);
    case "swap":
      return toSwapCase(value);
    default:
      return value;
  }
}

function getCurrentWordRange(editor: Editor): { from: number; to: number } | null {
  const { selection } = editor.state;
  if (!selection.empty) {
    return { from: selection.from, to: selection.to };
  }

  const { $from } = selection;
  const text = $from.parent.textContent;
  const offset = $from.parentOffset;
  const beforeMatch = text.slice(0, offset).match(/[A-Za-z0-9']+$/);
  const afterMatch = text.slice(offset).match(/^[A-Za-z0-9']+/);
  const startOffset = beforeMatch ? offset - beforeMatch[0].length : offset;
  const endOffset = afterMatch ? offset + afterMatch[0].length : offset;

  if (startOffset === endOffset) {
    return null;
  }

  return {
    from: $from.start() + startOffset,
    to: $from.start() + endOffset,
  };
}

function applyTextCase(editor: Editor, mode: TextCaseMode): boolean {
  if (editor.isActive("shapeBlock")) {
    const attrs = editor.getAttributes("shapeBlock") as { text?: string };
    return editor.chain().focus().updateAttributes("shapeBlock", { text: transformTextCase(attrs.text ?? "", mode) }).run();
  }

  const range = getCurrentWordRange(editor);
  if (!range) {
    return false;
  }

  const replacements: Array<{ from: number; to: number; text: string; marks: readonly Mark[] }> = [];
  editor.state.doc.nodesBetween(range.from, range.to, (node, position) => {
    if (!node.isText || !node.text) {
      return;
    }

    const from = Math.max(range.from, position);
    const to = Math.min(range.to, position + node.nodeSize);
    if (from >= to) {
      return;
    }

    replacements.push({
      from,
      to,
      text: transformTextCase(node.text.slice(from - position, to - position), mode),
      marks: node.marks,
    });
  });

  if (replacements.length === 0) {
    return false;
  }

  let tr = editor.state.tr;
  replacements.forEach((replacement) => {
    const from = tr.mapping.map(replacement.from);
    const to = tr.mapping.map(replacement.to);
    tr = tr.replaceWith(from, to, editor.state.schema.text(replacement.text, replacement.marks));
  });
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
}

function updateActiveNodeAttributes(editor: Editor, attributes: Record<string, string>): boolean {
  const activeType = editablePaintNodeTypes.find((nodeType) => editor.isActive(nodeType));
  if (!activeType) {
    return false;
  }
  return editor.chain().focus().updateAttributes(activeType, attributes).run();
}


type VersionModalState = {
  version_label: string;
  change_summary: string;
  draft_notes: string;
};


type ClaimModalState = {
  claimText: string;
  referenceNote: string;
  linkedReferenceId: string;
};


export function ContentAuthoringStudio() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const rawWorkspaceId = params.contentWorkspaceId ?? params.documentId;
  const contentWorkspaceId = Number(rawWorkspaceId);
  const editorSessionIdRef = useRef(createStableId("session"));
  const hasHydratedEditor = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [detail, setDetail] = useState<ContentWorkspaceEditorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionForm, setVersionForm] = useState<VersionModalState>({
    version_label: "",
    change_summary: "",
    draft_notes: "",
  });
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionFileError, setVersionFileError] = useState<string | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState<ClaimModalState>({
    claimText: "",
    referenceNote: "",
    linkedReferenceId: "",
  });

  const canUseAuthoringRoute =
    hasPermission("CAN_MANAGE_SYSTEM") ||
    hasPermission("CAN_AUTHOR_CONTENT") ||
    hasPermission("CAN_CREATE_CONTENT_DRAFT") ||
    hasPermission("CAN_MANAGE_CONTENT_VERSIONS");

  const canEdit = Boolean(detail?.can_edit_authoring_content && canUseAuthoringRoute);
  const request = detail?.linked_request ?? null;
  const workspace = detail?.content_workspace ?? null;
  const currentVersion = detail?.current_draft_version ?? null;
  const referenceMaterials = detail?.reference_materials ?? [];
  const nextVersionNumber = (workspace?.draft_versions?.[0]?.version_number ?? workspace?.draft_versions_count ?? 0) + 1;
  const isMedicalRevisionAuthoring = request?.status === "MEDICAL_REVISION_IN_PROGRESS";

  const editor = useEditor({
    extensions: editorExtensions,
    content: emptyDocument(),
    editable: false,
    onUpdate: () => {
      setIsDirty(true);
      setSuccessMessage(null);
    },
  });

  const fetchEditor = useCallback(async () => {
    if (!Number.isFinite(contentWorkspaceId)) {
      setErrorMessage("Content dashboard not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextDetail = await getContentWorkspaceEditor(contentWorkspaceId);
      setDetail(nextDetail);
      setLastSavedAt(nextDetail.latest_autosave?.autosaved_at ?? null);
      setVersionForm((current) => ({
        ...current,
        version_label: nextDetail.linked_request?.status === "MEDICAL_REVISION_IN_PROGRESS"
          ? `Revised Draft V${(nextDetail.content_workspace.draft_versions?.[0]?.version_number ?? 0) + 1}`
          : `Draft V${(nextDetail.content_workspace.draft_versions?.[0]?.version_number ?? 0) + 1}`,
      }));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [contentWorkspaceId]);

  useEffect(() => {
    void fetchEditor();
  }, [fetchEditor]);

  useEffect(() => {
    if (!editor || !detail || hasHydratedEditor.current) {
      return;
    }
    editor.commands.setContent(resolveInitialContent(detail), { emitUpdate: false });
    editor.setEditable(Boolean(detail.can_edit_authoring_content));
    hasHydratedEditor.current = true;
    setIsDirty(false);
  }, [detail, editor]);

  useEffect(() => {
    editor?.setEditable(canEdit && !isPreviewMode);
  }, [canEdit, editor, isPreviewMode]);

  const saveAutosave = useCallback(async () => {
    if (!editor || !detail || !canEdit) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await autosaveContentWorkspaceEditor(detail.content_workspace.id, {
        content_json: editor.getJSON() as Record<string, unknown>,
        content_html: editor.getHTML(),
        plain_text: normalizePlainText(editor),
        editor_session_id: editorSessionIdRef.current,
      });
      setLastSavedAt(response.autosaved_at);
      setIsDirty(false);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [canEdit, detail, editor]);

  useEffect(() => {
    if (!isDirty || !canEdit || !editor) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void saveAutosave();
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [canEdit, editor, isDirty, saveAutosave]);

  const openVersionModal = useCallback(() => {
    setVersionForm({
      version_label: isMedicalRevisionAuthoring ? `Revised Draft V${nextVersionNumber}` : `Draft V${nextVersionNumber}`,
      change_summary: isMedicalRevisionAuthoring ? "Medical revision changes addressing Medical Review feedback." : "",
      draft_notes: "",
    });
    setVersionFile(null);
    setVersionFileError(null);
    setIsVersionModalOpen(true);
  }, [isMedicalRevisionAuthoring, nextVersionNumber]);

  const handleVersionFileChange = useCallback((file: File | null) => {
    if (!file) {
      setVersionFile(null);
      setVersionFileError(null);
      return;
    }
    const validationError = validateDraftVersionFile(file);
    setVersionFileError(validationError);
    setVersionFile(validationError ? null : file);
  }, []);

  const handleCreateVersion = useCallback(async () => {
    if (!editor || !detail || !canEdit) {
      return;
    }

    const plainText = normalizePlainText(editor);
    if (plainText.length < 50) {
      setVersionFileError("Please add draft content before saving a version.");
      return;
    }
    if (!versionForm.change_summary.trim()) {
      setVersionFileError("Change summary is required.");
      return;
    }
    if (versionFileError) {
      return;
    }

    setIsCreatingVersion(true);
    setErrorMessage(null);
    setVersionFileError(null);
    try {
      let attachedFileAsset: Asset | null = null;
      if (versionFile) {
        attachedFileAsset = await uploadDocumentAsset(detail.content_workspace.id, versionFile, {
          asset_type: "DRAFT_PPT",
          is_primary: false,
          request_id: detail.content_workspace.request_id,
          create_content_version_metadata: false,
        });
      }

      const response = await createContentWorkspaceDraftVersionFromEditor(detail.content_workspace.id, {
        version_label: versionForm.version_label,
        content_json: editor.getJSON() as Record<string, unknown>,
        content_html: editor.getHTML(),
        plain_text: plainText,
        change_summary: versionForm.change_summary,
        draft_notes: versionForm.draft_notes,
        file_asset_id: attachedFileAsset?.id ?? null,
        editor_session_id: editorSessionIdRef.current,
      });

      setDetail((current) =>
        current
          ? {
              ...current,
              content_workspace: response.content_workspace,
              current_draft_version: response.draft_version,
            }
          : current,
      );
      setLastSavedAt(response.draft_version.finalized_at ?? response.draft_version.updated_at);
      setIsDirty(false);
      setIsVersionModalOpen(false);
      setSuccessMessage(`${response.draft_version.version_label ?? (isMedicalRevisionAuthoring ? "Revised draft version" : "Draft version")} created.`);
    } catch (error) {
      setVersionFileError(getApiErrorMessage(error));
    } finally {
      setIsCreatingVersion(false);
    }
  }, [canEdit, detail, editor, isMedicalRevisionAuthoring, versionFile, versionFileError, versionForm]);

  const handleLink = useCallback(() => {
    if (!editor) {
      return;
    }
    const currentHref = String(editor.getAttributes("link").href ?? "");
    const href = window.prompt("Link URL", currentHref);
    if (href === null) {
      return;
    }
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }, [editor]);

  const handleImageSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = "";
      if (!file || !editor || !detail || !canEdit) {
        return;
      }
      if (!imageAllowedMimeTypes.has(file.type)) {
        setErrorMessage("Unsupported image type. Upload a JPG or PNG image.");
        return;
      }

      const alt = window.prompt("Alt text", file.name) ?? file.name;
      const caption = window.prompt("Caption", "") ?? "";
      setIsSaving(true);
      setErrorMessage(null);
      try {
        const [dataUrl, uploadedAsset] = await Promise.all([
          readFileAsDataUrl(file),
          uploadDocumentAsset(detail.content_workspace.id, file, {
            asset_type: "SUPPORTING_FILE",
            is_primary: false,
            request_id: detail.content_workspace.request_id,
            create_content_version_metadata: false,
          }),
        ]);

        editor
          .chain()
          .focus()
          .insertContent({
            type: "imageBlock",
            attrs: {
              blockId: createStableId("image"),
              src: dataUrl,
              alt,
              caption,
              width: "100%",
              align: "center",
              aspectRatio: "auto",
              objectFit: "contain",
              objectPositionX: "50",
              objectPositionY: "50",
              rotation: "0",
              opacity: "100",
              borderRadius: "0",
              borderColor: "#e2e8f0",
              shadow: "none",
              assetId: String(uploadedAsset.id),
            },
          })
          .run();
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsSaving(false);
      }
    },
    [canEdit, detail, editor],
  );

  const editSelectedImage = useCallback(() => {
    if (!editor || !editor.isActive("imageBlock")) {
      return;
    }
    const attrs = editor.getAttributes("imageBlock") as { alt?: string; caption?: string };
    const alt = window.prompt("Alt text", attrs.alt ?? "") ?? attrs.alt ?? "";
    const caption = window.prompt("Caption", attrs.caption ?? "") ?? attrs.caption ?? "";
    editor.chain().focus().updateAttributes("imageBlock", { alt, caption }).run();
  }, [editor]);

  const updateSelectedImage = useCallback(
    (attributes: Record<string, string>) => {
      editor?.chain().focus().updateAttributes("imageBlock", attributes).run();
    },
    [editor],
  );

  const insertShape = useCallback(
    (shapeType: "rectangle" | "rounded" | "ellipse" | "triangle" | "line") => {
      editor
        ?.chain()
        .focus()
        .insertContent({
          type: "shapeBlock",
          attrs: {
            blockId: createStableId("shape"),
            shapeType,
            text: shapeType === "line" ? "" : "Shape",
            width: shapeType === "line" ? "320" : "220",
            height: shapeType === "line" ? "6" : "120",
            fillColor: "#e0f2fe",
            strokeColor: "#0284c7",
            textColor: "#0f172a",
            rotation: "0",
            opacity: "100",
          },
        })
        .run();
    },
    [editor],
  );

  const editSelectedShape = useCallback(() => {
    if (!editor || !editor.isActive("shapeBlock")) {
      return;
    }
    const attrs = editor.getAttributes("shapeBlock") as { text?: string; width?: string; height?: string };
    const text = window.prompt("Shape text", attrs.text ?? "") ?? attrs.text ?? "";
    const width = window.prompt("Width in px", attrs.width ?? "220") ?? attrs.width ?? "220";
    const height = window.prompt("Height in px", attrs.height ?? "120") ?? attrs.height ?? "120";
    editor.chain().focus().updateAttributes("shapeBlock", { text, width, height }).run();
  }, [editor]);

  const paintActiveBlock = useCallback(
    (attributes: Record<string, string>) => {
      if (editor) {
        updateActiveNodeAttributes(editor, attributes);
      }
    },
    [editor],
  );

  const groupSelection = useCallback(() => {
    editor?.chain().focus().wrapIn("designGroupBlock").run();
  }, [editor]);

  const ungroupSelection = useCallback(() => {
    editor?.chain().focus().lift("designGroupBlock").run();
  }, [editor]);

  const deleteSelected = useCallback(() => {
    editor?.chain().focus().deleteSelection().run();
  }, [editor]);

  const applyCaseToSelection = useCallback(
    (mode: TextCaseMode) => {
      if (editor) {
        applyTextCase(editor, mode);
      }
    },
    [editor],
  );

  const insertCallout = useCallback(
    (variant: "rectangle" | "rounded") => {
      editor
        ?.chain()
        .focus()
        .insertContent({
          type: "calloutBlock",
          attrs: { blockId: createStableId("callout"), variant },
          content: [
            {
              type: "paragraph",
              attrs: { blockId: createStableId() },
              content: [{ type: "text", text: "Callout" }],
            },
          ],
        })
        .run();
    },
    [editor],
  );

  const insertNoteBlock = useCallback(() => {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "noteBlock",
        attrs: { blockId: createStableId("note") },
        content: [
          {
            type: "paragraph",
            attrs: { blockId: createStableId() },
            content: [{ type: "text", text: "Note" }],
          },
        ],
      })
      .run();
  }, [editor]);

  const insertClaimBlock = useCallback(() => {
    if (!editor || !claimForm.claimText.trim()) {
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: "claimReferenceBlock",
        attrs: {
          blockId: createStableId("claim"),
          claimText: claimForm.claimText.trim(),
          referenceNote: claimForm.referenceNote.trim(),
          linkedReferenceId: claimForm.linkedReferenceId || null,
        },
      })
      .run();
    setClaimForm({ claimText: "", referenceNote: "", linkedReferenceId: "" });
    setIsClaimModalOpen(false);
  }, [claimForm, editor]);

  const renderedPreviewHtml = useMemo(() => editor?.getHTML() ?? "", [editor, isPreviewMode, isDirty, lastSavedAt]);

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <LoadingState label="Loading authoring studio..." rows={4} />
      </PageContainer>
    );
  }

  if (errorMessage && !detail) {
    return (
      <PageContainer width="wide">
        <ErrorState message={errorMessage} onRetry={() => void fetchEditor()} />
      </PageContainer>
    );
  }

  if (!detail || !workspace) {
    return (
      <PageContainer width="wide">
        <ErrorState message="Content dashboard not found." />
      </PageContainer>
    );
  }

  const isAssignedTherapyLead = Boolean(request?.assigned_therapy_lead_id && user?.id === request.assigned_therapy_lead_id);

  return (
    <PageContainer width="wide" className="pb-8">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleImageSelected}
      />

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Content Authoring Studio</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-950">{workspace.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>{workspace.document_number}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <StatusBadge status={request?.status ?? workspace.status} />
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{isDirty ? "Unsaved changes" : `Saved at ${formatSavedTime(lastSavedAt)}`}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => void saveAutosave()} disabled={!canEdit || isSaving}>
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button type="button" className={primaryButtonClass} onClick={openVersionModal} disabled={!canEdit || isCreatingVersion}>
              {isMedicalRevisionAuthoring ? "Create Revised Version" : "Create Version"}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => setIsPreviewMode((current) => !current)}>
              {isPreviewMode ? "Edit" : "Preview"}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => navigate(`/documents/${workspace.id}`)}>
              Close
            </button>
          </div>
        </div>

        {(errorMessage || successMessage || !canEdit) && (
          <div
            className={[
              "mx-5 mt-4 rounded-md border px-3 py-2 text-sm",
              errorMessage
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : successMessage
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800",
            ].join(" ")}
          >
            {errorMessage || successMessage || "This authoring dashboard is read-only for your current role or request state."}
          </div>
        )}

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 border-r border-slate-200">
            <AuthoringToolbar
              editor={editor}
              disabled={!canEdit || isPreviewMode}
              onLink={handleLink}
              onInsertImage={() => imageInputRef.current?.click()}
              onInsertCallout={insertCallout}
              onInsertNote={insertNoteBlock}
              onOpenClaimModal={() => setIsClaimModalOpen(true)}
              onEditImage={editSelectedImage}
              onUpdateImage={updateSelectedImage}
              onInsertShape={insertShape}
              onEditShape={editSelectedShape}
              onPaint={paintActiveBlock}
              onGroup={groupSelection}
              onUngroup={ungroupSelection}
              onDeleteSelected={deleteSelected}
              onTextCase={applyCaseToSelection}
            />

            {isPreviewMode ? (
              <div className="min-h-[720px] bg-slate-50 p-6">
                <article
                  className="authoring-preview mx-auto min-h-[680px] max-w-4xl rounded-md border border-slate-200 bg-white px-12 py-10 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
                />
              </div>
            ) : (
              <div className="min-h-[720px] bg-slate-50 p-6">
                <div className="mx-auto min-h-[680px] max-w-4xl rounded-md border border-slate-200 bg-white px-12 py-10 shadow-sm">
                  <EditorContent editor={editor} />
                </div>
              </div>
            )}
          </main>

          <AuthoringSidebar
            detail={detail}
            isAssignedTherapyLead={isAssignedTherapyLead}
            referenceMaterials={referenceMaterials}
            currentVersionInfo={
              currentVersion
                ? `${currentVersion.version_label ?? `Draft V${currentVersion.version_number}`} / ${
                    contentAuthoringModeLabels[currentVersion.authoring_mode] ?? "File Upload"
                  }`
                : "No version yet"
            }
          />
        </div>
      </div>

      {isVersionModalOpen && (
        <CreateVersionModal
          form={versionForm}
          file={versionFile}
          errorMessage={versionFileError}
          isSubmitting={isCreatingVersion}
          isMedicalRevision={isMedicalRevisionAuthoring}
          onChange={setVersionForm}
          onFileChange={handleVersionFileChange}
          onClose={() => setIsVersionModalOpen(false)}
          onSubmit={handleCreateVersion}
        />
      )}

      {isClaimModalOpen && (
        <ClaimReferenceModal
          form={claimForm}
          referenceMaterials={referenceMaterials}
          onChange={setClaimForm}
          onClose={() => setIsClaimModalOpen(false)}
          onSubmit={insertClaimBlock}
        />
      )}
    </PageContainer>
  );
}


type AuthoringToolbarProps = {
  editor: Editor | null;
  disabled: boolean;
  onLink: () => void;
  onInsertImage: () => void;
  onInsertCallout: (variant: "rectangle" | "rounded") => void;
  onInsertNote: () => void;
  onOpenClaimModal: () => void;
  onEditImage: () => void;
  onUpdateImage: (attributes: Record<string, string>) => void;
  onInsertShape: (shapeType: "rectangle" | "rounded" | "ellipse" | "triangle" | "line") => void;
  onEditShape: () => void;
  onPaint: (attributes: Record<string, string>) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDeleteSelected: () => void;
  onTextCase: (mode: TextCaseMode) => void;
};


function AuthoringToolbar({
  editor,
  disabled,
  onLink,
  onInsertImage,
  onInsertCallout,
  onInsertNote,
  onOpenClaimModal,
  onEditImage,
  onUpdateImage,
  onInsertShape,
  onEditShape,
  onPaint,
  onGroup,
  onUngroup,
  onDeleteSelected,
  onTextCase,
}: AuthoringToolbarProps) {
  const isDisabled = disabled || !editor;
  const tableActive = Boolean(editor?.isActive("table"));
  const imageActive = Boolean(editor?.isActive("imageBlock"));
  const shapeActive = Boolean(editor?.isActive("shapeBlock"));
  const groupActive = Boolean(editor?.isActive("designGroupBlock"));
  const designObjectActive = imageActive || shapeActive;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
      <ToolbarButton label="Undo" disabled={isDisabled} onClick={() => editor?.chain().focus().undo().run()} />
      <ToolbarButton label="Redo" disabled={isDisabled} onClick={() => editor?.chain().focus().redo().run()} />
      <ToolbarDivider />
      <ToolbarButton
        label="P"
        active={Boolean(editor?.isActive("paragraph"))}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().setParagraph().run()}
      />
      <ToolbarButton
        label="H1"
        active={Boolean(editor?.isActive("heading", { level: 1 }))}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label="H2"
        active={Boolean(editor?.isActive("heading", { level: 2 }))}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="H3"
        active={Boolean(editor?.isActive("heading", { level: 3 }))}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <ToolbarDivider />
      <ToolbarButton label="B" active={Boolean(editor?.isActive("bold"))} disabled={isDisabled} onClick={() => editor?.chain().focus().toggleBold().run()} />
      <ToolbarButton label="I" active={Boolean(editor?.isActive("italic"))} disabled={isDisabled} onClick={() => editor?.chain().focus().toggleItalic().run()} />
      <ToolbarButton label="U" active={Boolean(editor?.isActive("underline"))} disabled={isDisabled} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
      <ToolbarButton label="Link" active={Boolean(editor?.isActive("link"))} disabled={isDisabled} onClick={onLink} />
      <ToolbarButton label="UPPER" disabled={isDisabled} onClick={() => onTextCase("upper")} />
      <ToolbarButton label="lower" disabled={isDisabled} onClick={() => onTextCase("lower")} />
      <ToolbarButton label="Title" disabled={isDisabled} onClick={() => onTextCase("title")} />
      <ToolbarButton label="Sentence" disabled={isDisabled} onClick={() => onTextCase("sentence")} />
      <ToolbarButton label="Swap Case" disabled={isDisabled} onClick={() => onTextCase("swap")} />
      <ToolbarDivider />
      <ToolbarButton label="Bullets" active={Boolean(editor?.isActive("bulletList"))} disabled={isDisabled} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
      <ToolbarButton label="Numbers" active={Boolean(editor?.isActive("orderedList"))} disabled={isDisabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton label="Left" disabled={isDisabled} onClick={() => editor?.chain().focus().setTextAlign("left").run()} />
      <ToolbarButton label="Center" disabled={isDisabled} onClick={() => editor?.chain().focus().setTextAlign("center").run()} />
      <ToolbarButton label="Right" disabled={isDisabled} onClick={() => editor?.chain().focus().setTextAlign("right").run()} />
      <ToolbarDivider />
      <ToolbarButton label="Table" disabled={isDisabled} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
      <ToolbarButton label="+ Row" disabled={isDisabled || !tableActive} onClick={() => editor?.chain().focus().addRowAfter().run()} />
      <ToolbarButton label="+ Col" disabled={isDisabled || !tableActive} onClick={() => editor?.chain().focus().addColumnAfter().run()} />
      <ToolbarButton label="- Row" disabled={isDisabled || !tableActive} onClick={() => editor?.chain().focus().deleteRow().run()} />
      <ToolbarButton label="- Col" disabled={isDisabled || !tableActive} onClick={() => editor?.chain().focus().deleteColumn().run()} />
      <ToolbarDivider />
      <ToolbarButton label="Image" disabled={isDisabled} onClick={onInsertImage} />
      <ToolbarButton label="Image Meta" disabled={isDisabled || !imageActive} onClick={onEditImage} />
      <ToolbarButton label="50%" disabled={isDisabled || !imageActive} onClick={() => editor?.chain().focus().updateAttributes("imageBlock", { width: "50%" }).run()} />
      <ToolbarButton label="100%" disabled={isDisabled || !imageActive} onClick={() => editor?.chain().focus().updateAttributes("imageBlock", { width: "100%" }).run()} />
      <ToolbarButton label="Crop 1:1" disabled={isDisabled || !imageActive} onClick={() => onUpdateImage({ aspectRatio: "1 / 1", objectFit: "cover" })} />
      <ToolbarButton label="Crop 16:9" disabled={isDisabled || !imageActive} onClick={() => onUpdateImage({ aspectRatio: "16 / 9", objectFit: "cover" })} />
      <ToolbarButton label="Fit" disabled={isDisabled || !imageActive} onClick={() => onUpdateImage({ aspectRatio: "auto", objectFit: "contain", objectPositionX: "50", objectPositionY: "50" })} />
      <ToolbarButton label="Left Crop" disabled={isDisabled || !imageActive} onClick={() => onUpdateImage({ objectPositionX: "0" })} />
      <ToolbarButton label="Right Crop" disabled={isDisabled || !imageActive} onClick={() => onUpdateImage({ objectPositionX: "100" })} />
      <ToolbarButton label="Soft Shadow" disabled={isDisabled || !imageActive} onClick={() => onUpdateImage({ shadow: "soft" })} />
      <ToolbarDivider />
      <ToolbarButton label="Rect" disabled={isDisabled} onClick={() => onInsertShape("rectangle")} />
      <ToolbarButton label="Round" disabled={isDisabled} onClick={() => onInsertShape("rounded")} />
      <ToolbarButton label="Circle" disabled={isDisabled} onClick={() => onInsertShape("ellipse")} />
      <ToolbarButton label="Tri" disabled={isDisabled} onClick={() => onInsertShape("triangle")} />
      <ToolbarButton label="Line" disabled={isDisabled} onClick={() => onInsertShape("line")} />
      <ToolbarButton label="Shape Edit" disabled={isDisabled || !shapeActive} onClick={onEditShape} />
      <ToolbarButton label="- Rotate" disabled={isDisabled || !designObjectActive} onClick={() => updateActiveNodeAttributes(editor!, { rotation: "-8" })} />
      <ToolbarButton label="+ Rotate" disabled={isDisabled || !designObjectActive} onClick={() => updateActiveNodeAttributes(editor!, { rotation: "8" })} />
      <ToolbarButton label="Fade" disabled={isDisabled || !designObjectActive} onClick={() => updateActiveNodeAttributes(editor!, { opacity: "70" })} />
      <ToolbarDivider />
      {paintPalette.map((color) => (
        <ColorSwatch key={`text-${color}`} label={`Text ${color}`} color={color} disabled={isDisabled} onClick={() => onPaint({ textColor: color })} />
      ))}
      {fillPalette.map((color) => (
        <ColorSwatch key={`fill-${color}`} label={`Fill ${color}`} color={color} disabled={isDisabled} onClick={() => onPaint({ fillColor: color })} />
      ))}
      <ToolbarDivider />
      <ToolbarButton label="Group" disabled={isDisabled} onClick={onGroup} />
      <ToolbarButton label="Ungroup" disabled={isDisabled || !groupActive} onClick={onUngroup} />
      <ToolbarButton label="Delete" disabled={isDisabled} onClick={onDeleteSelected} />
      <ToolbarDivider />
      <ToolbarButton label="Claim/Ref" disabled={isDisabled} onClick={onOpenClaimModal} />
      <ToolbarButton label="Callout" disabled={isDisabled} onClick={() => onInsertCallout("rectangle")} />
      <ToolbarButton label="Rounded" disabled={isDisabled} onClick={() => onInsertCallout("rounded")} />
      <ToolbarButton label="2 Col" disabled={isDisabled} onClick={() => editor?.chain().focus().insertTable({ rows: 1, cols: 2, withHeaderRow: false }).run()} />
      <ToolbarButton label="Divider" disabled={isDisabled} onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
      <ToolbarButton label="Note" disabled={isDisabled} onClick={onInsertNote} />
    </div>
  );
}


type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};


function ToolbarButton({ label, active = false, disabled = false, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={active ? activeToolbarButtonClass : toolbarButtonClass}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {label}
    </button>
  );
}

type ColorSwatchProps = {
  label: string;
  color: string;
  disabled?: boolean;
  onClick: () => void;
};

function ColorSwatch({ label, color, disabled = false, onClick }: ColorSwatchProps) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <span className="h-4 w-4 rounded-sm border border-slate-300" style={{ backgroundColor: color }} />
    </button>
  );
}


function ToolbarDivider() {
  return <span className="h-6 w-px bg-slate-200" aria-hidden="true" />;
}


type AuthoringSidebarProps = {
  detail: ContentWorkspaceEditorDetail;
  isAssignedTherapyLead: boolean;
  referenceMaterials: ContentRequestReferenceMaterial[];
  currentVersionInfo: string;
};


function AuthoringSidebar({ detail, isAssignedTherapyLead, referenceMaterials, currentVersionInfo }: AuthoringSidebarProps) {
  const request = detail.linked_request;
  const latestAlignmentComments = request?.latest_therapy_alignment_comments?.slice(0, 5) ?? [];
  const alignmentStatus = request?.therapy_alignment_status ?? "PENDING";

  return (
    <aside className="min-w-0 bg-white">
      <SidebarSection title="Request Package">
        <SidebarRow label="Request" value={request?.request_number ?? request?.title ?? "Not linked"} />
        <SidebarRow label="Priority" value={request?.priority ?? "Not set"} />
        <SidebarRow label="Owner" value={isAssignedTherapyLead ? "Assigned Therapy Lead" : "Read-only"} />
        <SidebarRow label="Current Version" value={currentVersionInfo} />
      </SidebarSection>

      <SidebarSection title="Therapy Alignment">
        <SidebarRow label="Status" value={therapyAlignmentStatusLabels[alignmentStatus] ?? alignmentStatus} />
        <SidebarRow label="Open Comments" value={String(request?.open_therapy_alignment_comment_count ?? 0)} />
        {alignmentStatus === "COMPLETED" && request?.therapy_alignment_summary && (
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.therapy_alignment_summary}</p>
          </div>
        )}
        <AlignmentCommentMiniList comments={latestAlignmentComments} />
        {request && (
          <Link
            to={`/requests/${request.id}#therapy-alignment`}
            className="mt-3 inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Open Alignment Panel
          </Link>
        )}
      </SidebarSection>

      {detail.medical_feedback && (
        <MedicalFeedbackSidebar feedback={detail.medical_feedback} />
      )}

      <SidebarSection title="Key Messages">
        <SidebarText value={detail.key_messages || request?.key_messages || "Not provided"} />
      </SidebarSection>

      <SidebarSection title="Local Requirements">
        <SidebarText value={detail.local_requirements || request?.local_requirements || "Not provided"} />
      </SidebarSection>

      <SidebarSection title="Reference Materials">
        {referenceMaterials.length === 0 ? (
          <p className="text-sm text-slate-500">No reference materials</p>
        ) : (
          <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {referenceMaterials.map((material) => (
              <a
                key={material.id}
                href={material.download_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-2 text-sm transition hover:bg-slate-50"
              >
                <span className="block font-medium text-slate-950">{material.original_filename}</span>
                <span className="mt-1 block text-xs text-slate-500">{formatFileSize(material.file_size)}</span>
              </a>
            ))}
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="Regional Notes">
        <SidebarText value={detail.regional_evaluation_notes || "Not provided"} />
      </SidebarSection>

      <SidebarSection title="Version Info">
        <SidebarRow label="Draft Versions" value={String(detail.content_workspace.draft_versions_count)} />
        <SidebarRow label="Autosaved" value={formatDateTime(detail.latest_autosave?.autosaved_at)} />
        <SidebarRow label="Last Edited" value={detail.latest_autosave?.last_edited_by?.full_name ?? "Not saved"} />
      </SidebarSection>
    </aside>
  );
}


function MedicalFeedbackSidebar({ feedback }: { feedback: NonNullable<ContentWorkspaceEditorDetail["medical_feedback"]> }) {
  const revision = feedback.medical_revision;
  const mandatoryComments = feedback.open_mandatory_comments ?? [];
  const optionalComments = feedback.optional_comments ?? [];
  const referenceIssues = feedback.reference_issues ?? [];

  return (
    <SidebarSection title="Medical Feedback">
      <div className="space-y-3">
        {revision?.revision_reason || revision?.revision_notes ? (
          <div>
            <SidebarRow
              label="Revision Reason"
              value={revision.revision_reason ? getStatusLabel(revision.revision_reason) : "Not set"}
            />
            <SidebarText value={revision.revision_notes || "No revision notes provided"} />
          </div>
        ) : null}

        <div className="grid gap-2">
          <SidebarRow label="Mandatory Comments" value={String(mandatoryComments.length)} />
          <SidebarRow label="Optional Comments" value={String(optionalComments.length)} />
          <SidebarRow label="Reference Issues" value={String(referenceIssues.length)} />
        </div>

        {mandatoryComments.slice(0, 5).map((comment) => (
          <div key={comment.id} className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
              {getStatusLabel(comment.comment_category)} / {getStatusLabel(comment.severity)}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-orange-950">{comment.comment_text}</p>
          </div>
        ))}

        {optionalComments.slice(0, 3).map((comment) => (
          <div key={comment.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Optional / {getStatusLabel(comment.comment_category)}
            </p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-5 text-slate-700">{comment.comment_text}</p>
          </div>
        ))}

        {referenceIssues.slice(0, 4).map((issue) => (
          <div key={issue.id} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Reference Issue</p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-5 text-amber-950">
              {issue.claim_text || issue.reference_note || issue.validation_notes || "Replacement reference required."}
            </p>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}


function AlignmentCommentMiniList({ comments }: { comments: TherapyAlignmentCommentSummary[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-slate-500">No alignment comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {therapyAlignmentTopicLabels[comment.topic_code] ?? comment.topic_code.split("_").join(" ")}
          </p>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-5 text-slate-700">{comment.comment_text}</p>
          <p className="mt-2 text-xs text-slate-500">
            {comment.created_by?.full_name ?? "User"} / {formatDateTime(comment.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
}


type SidebarSectionProps = {
  title: string;
  children: ReactNode;
};


function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <section className="border-b border-slate-200 px-4 py-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}


function SidebarText({ value }: { value: string }) {
  return <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>;
}


function SidebarRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}


type CreateVersionModalProps = {
  form: VersionModalState;
  file: File | null;
  errorMessage: string | null;
  isSubmitting: boolean;
  isMedicalRevision: boolean;
  onChange: (form: VersionModalState) => void;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onSubmit: () => void;
};


function CreateVersionModal({
  form,
  file,
  errorMessage,
  isSubmitting,
  isMedicalRevision,
  onChange,
  onFileChange,
  onClose,
  onSubmit,
}: CreateVersionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {isMedicalRevision ? "Create Revised Draft Version" : "Create Draft Version"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Internal Editor or Hybrid Editor + File</p>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            Close
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Version Label</span>
            <input
              type="text"
              value={form.version_label}
              onChange={(event) => onChange({ ...form, version_label: event.target.value })}
              disabled={isSubmitting}
              maxLength={120}
              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Change Summary</span>
            <textarea
              value={form.change_summary}
              onChange={(event) => onChange({ ...form, change_summary: event.target.value })}
              disabled={isSubmitting}
              rows={3}
              maxLength={5000}
              className="mt-2 block min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft Notes</span>
            <textarea
              value={form.draft_notes}
              onChange={(event) => onChange({ ...form, draft_notes: event.target.value })}
              disabled={isSubmitting}
              rows={4}
              maxLength={10000}
              className="mt-2 block min-h-[110px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Optional Draft File</span>
            <input
              type="file"
              accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              disabled={isSubmitting}
              className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700"
            />
            <p className="mt-1 text-xs text-slate-500">{file ? `Selected: ${file.name}` : "No file selected"}</p>
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : isMedicalRevision ? "Create Revised Draft Version" : "Create Draft Version"}
          </button>
        </div>
      </div>
    </div>
  );
}


type ClaimReferenceModalProps = {
  form: ClaimModalState;
  referenceMaterials: ContentRequestReferenceMaterial[];
  onChange: (form: ClaimModalState) => void;
  onClose: () => void;
  onSubmit: () => void;
};


function ClaimReferenceModal({ form, referenceMaterials, onChange, onClose, onSubmit }: ClaimReferenceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-950">Claim / Reference Block</h2>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Claim Text</span>
            <textarea
              value={form.claimText}
              onChange={(event) => onChange({ ...form, claimText: event.target.value })}
              rows={4}
              className="mt-2 block min-h-[110px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference Note</span>
            <textarea
              value={form.referenceNote}
              onChange={(event) => onChange({ ...form, referenceNote: event.target.value })}
              rows={3}
              className="mt-2 block min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked Reference Material</span>
            <select
              value={form.linkedReferenceId}
              onChange={(event) => onChange({ ...form, linkedReferenceId: event.target.value })}
              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Not linked</option>
              {referenceMaterials.map((material) => (
                <option key={material.id} value={String(material.id)}>
                  {material.original_filename}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} onClick={onSubmit} disabled={!form.claimText.trim()}>
            Insert Block
          </button>
        </div>
      </div>
    </div>
  );
}
