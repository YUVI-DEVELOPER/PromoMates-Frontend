import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  createDesignBrief,
  getDesignAssignees,
  submitDesignBrief,
  updateDesignBrief,
} from "../../api/designJobs";
import { getLanguages } from "../../api/masterData";
import type { ContentVersion } from "../../types/contentVersion";
import type { DesignAssignee, DesignJob, DesignBriefPayload } from "../../types/designJob";
import type { Channel, DesignAgency, Language } from "../../types/masterData";
import type {
  ContentWorkspaceCurrentVersion,
  ContentWorkspaceSummary,
  DesignBriefSummary,
  MaterialRequest,
} from "../../types/materialRequest";
import type { UserGroupOption } from "../../types/userGroup";
import { getApiErrorMessage } from "../../utils/apiError";
import { StatusBadge, getStatusLabel } from "../ui/StatusBadge";
import { SummaryCard } from "../ui/SummaryCard";


type ApprovedVersion = ContentVersion | ContentWorkspaceCurrentVersion;

type DesignBriefPanelProps = {
  request: MaterialRequest;
  brief: DesignJob | DesignBriefSummary | null;
  approvedVersion: ApprovedVersion | null;
  workspace: ContentWorkspaceSummary | null;
  channels: Channel[];
  canCreate: boolean;
  canSubmit: boolean;
  isAssignedTherapyLead: boolean;
  isAdmin: boolean;
  onChanged: (message: string) => Promise<void> | void;
};

type FormState = {
  design_title: string;
  design_objective: string;
  design_format: string;
  output_specifications: string;
  size_or_dimension: string;
  channel_id: string;
  language_id: string;
  priority: string;
  due_date: string;
  visual_direction: string;
  brand_guidelines: string;
  mandatory_content: string;
  local_requirements: string;
  claims_and_references_notes: string;
  audience_summary: string;
  assigned_designer_id: string;
  assigned_design_group_id: string;
  design_agency_id: string;
};

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const inputClass =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500";

const textareaClass =
  "block min-h-[92px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500";

const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function toIdInput(value: number | null | undefined): string {
  return value ? String(value) : "";
}

function numberOrNull(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getVersionLabel(version: ApprovedVersion | null): string {
  if (!version) {
    return "Missing approved version";
  }

  const versionNumber = version.version_number ? `V${version.version_number}` : "Version";
  return version.version_label ? `${version.version_label} (${versionNumber})` : versionNumber;
}

function getUserLabel(user: { full_name?: string | null; email?: string | null } | null | undefined, fallbackId?: number | null): string {
  if (user?.full_name) {
    return user.email ? `${user.full_name} (${user.email})` : user.full_name;
  }
  return fallbackId ? `User ${fallbackId}` : "Not assigned";
}

function getReferenceLabel(
  options: Array<{ id: number; name: string; code?: string | null }>,
  id: number | null | undefined,
  fallback = "Not set",
): string {
  if (!id) {
    return fallback;
  }
  const option = options.find((candidate) => candidate.id === id);
  if (!option) {
    return `ID ${id}`;
  }
  return option.code ? `${option.name} (${option.code})` : option.name;
}

function initialFormState(
  request: MaterialRequest,
  brief: DesignJob | DesignBriefSummary | null,
): FormState {
  return {
    design_title: brief?.design_title ?? request.title ?? request.request_title ?? "",
    design_objective: brief?.design_objective ?? request.business_objective ?? "",
    design_format: brief?.design_format ?? request.material_type?.name ?? "",
    output_specifications: brief?.output_specifications ?? "",
    size_or_dimension: brief?.size_or_dimension ?? "",
    channel_id: toIdInput(brief?.channel_id ?? request.channel_id),
    language_id: toIdInput(brief?.language_id),
    priority: brief?.priority ?? request.priority ?? "",
    due_date: toDateInput(brief?.due_date ?? request.required_by_date),
    visual_direction: brief?.visual_direction ?? "",
    brand_guidelines: brief?.brand_guidelines ?? "",
    mandatory_content: brief?.mandatory_content ?? request.key_messages ?? "",
    local_requirements: brief?.local_requirements ?? request.local_requirements ?? "",
    claims_and_references_notes: brief?.claims_and_references_notes ?? request.reference_notes ?? "",
    audience_summary: brief?.audience_summary ?? request.target_audience?.name ?? "",
    assigned_designer_id: toIdInput(brief?.assigned_designer_id),
    assigned_design_group_id: toIdInput(brief?.assigned_design_group_id),
    design_agency_id: toIdInput(brief?.design_agency_id ?? brief?.agency_id),
  };
}

function buildPayload(
  form: FormState,
  workspace: ContentWorkspaceSummary | null,
  approvedVersion: ApprovedVersion | null,
): DesignBriefPayload {
  return {
    content_workspace_id: workspace?.id ?? null,
    document_id: workspace?.id ?? null,
    approved_content_version_id: approvedVersion?.id ?? null,
    design_title: textOrNull(form.design_title),
    design_objective: textOrNull(form.design_objective),
    design_format: textOrNull(form.design_format),
    output_specifications: textOrNull(form.output_specifications),
    size_or_dimension: textOrNull(form.size_or_dimension),
    channel_id: numberOrNull(form.channel_id),
    language_id: numberOrNull(form.language_id),
    priority: textOrNull(form.priority),
    due_date: textOrNull(form.due_date),
    visual_direction: textOrNull(form.visual_direction),
    brand_guidelines: textOrNull(form.brand_guidelines),
    mandatory_content: textOrNull(form.mandatory_content),
    local_requirements: textOrNull(form.local_requirements),
    claims_and_references_notes: textOrNull(form.claims_and_references_notes),
    audience_summary: textOrNull(form.audience_summary),
    assigned_designer_id: numberOrNull(form.assigned_designer_id),
    assigned_design_group_id: numberOrNull(form.assigned_design_group_id),
    design_agency_id: numberOrNull(form.design_agency_id),
    agency_id: numberOrNull(form.design_agency_id),
  };
}

function validateSubmit(form: FormState, approvedVersion: ApprovedVersion | null): string | null {
  const requiredFields: Array<[keyof FormState, string]> = [
    ["design_title", "Design title"],
    ["design_objective", "Design objective"],
    ["design_format", "Design format"],
    ["visual_direction", "Visual direction"],
    ["mandatory_content", "Mandatory content"],
    ["output_specifications", "Output specifications"],
    ["due_date", "Due date"],
  ];
  const missing = requiredFields
    .filter(([fieldName]) => !form[fieldName].trim())
    .map(([, label]) => label);

  if (!approvedVersion?.id) {
    missing.push("Approved content version");
  }

  if (missing.length > 0) {
    return `Complete required fields before submitting: ${missing.join(", ")}.`;
  }

  if (!form.assigned_designer_id && !form.assigned_design_group_id && !form.design_agency_id) {
    return "Assign a Designer or Design Group before submitting the design brief.";
  }

  return null;
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
      {required ? <span className="text-rose-600"> *</span> : null}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{value || "Not set"}</dd>
    </div>
  );
}

export function DesignBriefPanel({
  request,
  brief,
  approvedVersion,
  workspace,
  channels,
  canCreate,
  canSubmit,
  isAssignedTherapyLead,
  isAdmin,
  onChanged,
}: DesignBriefPanelProps) {
  const [form, setForm] = useState<FormState>(() => initialFormState(request, brief));
  const [designers, setDesigners] = useState<DesignAssignee[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [agencies, setAgencies] = useState<DesignAgency[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialFormState(request, brief));
  }, [brief, request]);

  const isDraft = !brief || brief.status === "DRAFT";
  const canEdit = isDraft && (isAdmin || isAssignedTherapyLead) && (canCreate || canSubmit);

  useEffect(() => {
    let isMounted = true;
    setIsOptionsLoading(true);

    const assignmentOptionsPromise = canEdit
      ? getDesignAssignees(request.id).catch(() => ({
          designers: [] as DesignAssignee[],
          design_groups: [] as UserGroupOption[],
          design_agencies: [] as DesignAgency[],
        }))
      : Promise.resolve({
          designers: [] as DesignAssignee[],
          design_groups: [] as UserGroupOption[],
          design_agencies: [] as DesignAgency[],
        });

    const languagesPromise = canEdit
      ? getLanguages({ include_inactive: false }).catch(() => [] as Language[])
      : Promise.resolve([] as Language[]);

    Promise.all([
      assignmentOptionsPromise,
      languagesPromise,
    ])
      .then(([assignmentOptions, nextLanguages]) => {
        if (!isMounted) {
          return;
        }
        setDesigners(assignmentOptions.designers);
        setGroups(assignmentOptions.design_groups);
        setAgencies(assignmentOptions.design_agencies);
        setLanguages(nextLanguages);
      })
      .finally(() => {
        if (isMounted) {
          setIsOptionsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canEdit, request.id]);
  const submittedLabel = brief?.submitted_at
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(brief.submitted_at))
    : "Not submitted";
  const taskStatus = request.design_task_summary?.status ?? null;

  const channelLabel = useMemo(
    () => brief?.channel?.name ?? getReferenceLabel(channels, brief?.channel_id ?? numberOrNull(form.channel_id)),
    [brief?.channel?.name, brief?.channel_id, channels, form.channel_id],
  );
  const languageLabel = useMemo(
    () => brief?.language?.name ?? getReferenceLabel(languages, brief?.language_id ?? numberOrNull(form.language_id)),
    [brief?.language?.name, brief?.language_id, languages, form.language_id],
  );

  function updateField(fieldName: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [fieldName]: value }));
  }

  async function handleCreateDraft() {
    setErrorMessage(null);
    if (!approvedVersion?.id) {
      setErrorMessage("A medically approved content version is required before creating a design brief.");
      return;
    }

    setIsSaving(true);
    try {
      await createDesignBrief(request.id, buildPayload(form, workspace, approvedVersion));
      await onChanged("Design brief draft created.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveDraft() {
    setErrorMessage(null);
    if (!approvedVersion?.id) {
      setErrorMessage("A medically approved content version is required before saving the design brief.");
      return;
    }

    setIsSaving(true);
    try {
      if (brief) {
        await updateDesignBrief(request.id, brief.id, buildPayload(form, workspace, approvedVersion));
      } else {
        await createDesignBrief(request.id, buildPayload(form, workspace, approvedVersion));
      }
      await onChanged("Design brief draft saved.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    setErrorMessage(null);
    if (!brief) {
      setErrorMessage("Create and save the design brief draft before submitting it to Design.");
      return;
    }

    const validationMessage = validateSubmit(form, approvedVersion);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    try {
      await updateDesignBrief(request.id, brief.id, buildPayload(form, workspace, approvedVersion));
      await submitDesignBrief(request.id, brief.id);
      await onChanged("Design brief submitted to Design.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (!brief && request.status === "MEDICAL_CONTENT_APPROVED") {
    return (
      <SummaryCard
        title="Create Design Brief"
        subtitle="Prepare the design instructions using the medically approved content version."
        action={
          canCreate ? (
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => {
                void handleCreateDraft();
              }}
              disabled={isSaving}
            >
              Create Design Brief
            </button>
          ) : null
        }
      >
        {errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
        {!approvedVersion ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No medically approved content version was found for this request. Complete Medical Content Approval before creating a design brief.
          </div>
        ) : (
          <dl className="grid gap-4 md:grid-cols-3">
            <DetailItem label="Request" value={request.title ?? request.request_number} />
            <DetailItem label="Workspace" value={workspace ? `${workspace.content_code} - ${workspace.title}` : null} />
            <DetailItem label="Approved Version" value={getVersionLabel(approvedVersion)} />
          </dl>
        )}
      </SummaryCard>
    );
  }

  if (!brief) {
    return null;
  }

  if (!isDraft) {
    return (
      <SummaryCard
        title="Design Brief"
        subtitle="Read-only design instructions submitted after Medical Content Approval."
        action={<StatusBadge status={brief.status} />}
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <DetailItem label="Submitted By" value={getUserLabel(brief.submitted_by, brief.submitted_by_id)} />
            <DetailItem label="Submitted At" value={submittedLabel} />
            <DetailItem label="Assigned Designer" value={getUserLabel(brief.assigned_designer, brief.assigned_designer_id)} />
            <DetailItem label="Task Status" value={taskStatus ? getStatusLabel(taskStatus) : "Not created"} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <DetailItem label="Approved Content Version" value={getVersionLabel(approvedVersion)} />
            <DetailItem label="Design Group" value={brief.assigned_design_group?.name ?? getReferenceLabel(groups, brief.assigned_design_group_id)} />
            <DetailItem label="Design Agency" value={brief.agency?.name ?? getReferenceLabel(agencies, brief.design_agency_id ?? brief.agency_id)} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-950">Design Requirements</h4>
              <dl className="grid gap-4 md:grid-cols-2">
                <DetailItem label="Design Title" value={brief.design_title} />
                <DetailItem label="Format" value={brief.design_format} />
                <DetailItem label="Channel" value={channelLabel} />
                <DetailItem label="Language" value={languageLabel} />
                <DetailItem label="Priority" value={brief.priority} />
                <DetailItem label="Due Date" value={brief.due_date ? formatDate(brief.due_date) : null} />
                <DetailItem label="Size / Dimension" value={brief.size_or_dimension} />
                <DetailItem label="Output Specifications" value={brief.output_specifications} />
              </dl>
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-950">Creative Direction</h4>
              <dl className="grid gap-4">
                <DetailItem label="Objective" value={brief.design_objective} />
                <DetailItem label="Visual Direction" value={brief.visual_direction} />
                <DetailItem label="Brand Guidelines" value={brief.brand_guidelines} />
                <DetailItem label="Mandatory Content" value={brief.mandatory_content} />
                <DetailItem label="Local Requirements" value={brief.local_requirements} />
                <DetailItem label="Claims and References" value={brief.claims_and_references_notes} />
              </dl>
            </section>
          </div>
        </div>
      </SummaryCard>
    );
  }

  return (
    <SummaryCard
      title="Design Brief"
      subtitle="Complete the structured design brief before submitting it to the assigned Designer or Design Group."
      action={<StatusBadge status={brief.status} />}
    >
      <div className="space-y-6">
        {errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-950">Approved Content</h4>
            <p className="mt-1 text-sm text-slate-600">
              Source content locked by Medical Content Approval.
            </p>
          </div>
          <dl className="grid gap-4 md:grid-cols-4">
            <DetailItem label="Request Title" value={request.title ?? request.request_number} />
            <DetailItem label="Workspace" value={workspace ? `${workspace.content_code} - ${workspace.title}` : null} />
            <DetailItem label="Approved Version" value={getVersionLabel(approvedVersion)} />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medical Approval</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {request.medical_approved_at ? formatDate(request.medical_approved_at) : "Completed"}
              </dd>
            </div>
          </dl>
          {workspace ? (
            <Link
              className="inline-flex text-sm font-semibold text-brand-700 hover:text-brand-600"
              to={`/content-workspaces/${workspace.id}/authoring`}
            >
              View approved version
            </Link>
          ) : null}
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-950">Design Requirements</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <FieldLabel label="Design Title" required />
              <input className={inputClass} value={form.design_title} onChange={(event) => updateField("design_title", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
            <label className="space-y-1">
              <FieldLabel label="Design Format" required />
              <input className={inputClass} value={form.design_format} onChange={(event) => updateField("design_format", event.target.value)} disabled={!canEdit || isSaving} placeholder="e.g. Detail aid, emailer, leave-behind" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <FieldLabel label="Design Objective" required />
              <textarea className={textareaClass} value={form.design_objective} onChange={(event) => updateField("design_objective", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
            <label className="space-y-1 md:col-span-2">
              <FieldLabel label="Output Specifications" required />
              <textarea className={textareaClass} value={form.output_specifications} onChange={(event) => updateField("output_specifications", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
            <label className="space-y-1">
              <FieldLabel label="Size / Dimension" />
              <input className={inputClass} value={form.size_or_dimension} onChange={(event) => updateField("size_or_dimension", event.target.value)} disabled={!canEdit || isSaving} placeholder="e.g. A4, 1080x1080, 16:9" />
            </label>
            <label className="space-y-1">
              <FieldLabel label="Channel" />
              <select className={inputClass} value={form.channel_id} onChange={(event) => updateField("channel_id", event.target.value)} disabled={!canEdit || isSaving}>
                <option value="">Select channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <FieldLabel label="Language" />
              <select className={inputClass} value={form.language_id} onChange={(event) => updateField("language_id", event.target.value)} disabled={!canEdit || isSaving || isOptionsLoading}>
                <option value="">Select language</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <FieldLabel label="Priority" />
              <select className={inputClass} value={form.priority} onChange={(event) => updateField("priority", event.target.value)} disabled={!canEdit || isSaving}>
                <option value="">Select priority</option>
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <FieldLabel label="Due Date" required />
              <input type="date" className={inputClass} value={form.due_date} onChange={(event) => updateField("due_date", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
            <label className="space-y-1">
              <FieldLabel label="Audience Summary" />
              <input className={inputClass} value={form.audience_summary} onChange={(event) => updateField("audience_summary", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-950">Creative Direction</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <FieldLabel label="Visual Direction" required />
              <textarea className={textareaClass} value={form.visual_direction} onChange={(event) => updateField("visual_direction", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
            <label className="space-y-1">
              <FieldLabel label="Brand Guidelines" />
              <textarea className={textareaClass} value={form.brand_guidelines} onChange={(event) => updateField("brand_guidelines", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
            <label className="space-y-1">
              <FieldLabel label="Mandatory Content" required />
              <textarea className={textareaClass} value={form.mandatory_content} onChange={(event) => updateField("mandatory_content", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
            <label className="space-y-1">
              <FieldLabel label="Local Requirements" />
              <textarea className={textareaClass} value={form.local_requirements} onChange={(event) => updateField("local_requirements", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
            <label className="space-y-1">
              <FieldLabel label="Claims and References Notes" />
              <textarea className={textareaClass} value={form.claims_and_references_notes} onChange={(event) => updateField("claims_and_references_notes", event.target.value)} disabled={!canEdit || isSaving} />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-950">Assignment</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <FieldLabel label="Designer" />
              <select className={inputClass} value={form.assigned_designer_id} onChange={(event) => updateField("assigned_designer_id", event.target.value)} disabled={!canEdit || isSaving || isOptionsLoading}>
                <option value="">Select designer</option>
                {designers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name} ({candidate.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <FieldLabel label="Design Group" />
              <select className={inputClass} value={form.assigned_design_group_id} onChange={(event) => updateField("assigned_design_group_id", event.target.value)} disabled={!canEdit || isSaving || isOptionsLoading}>
                <option value="">Select group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <FieldLabel label="Design Agency" />
              <select className={inputClass} value={form.design_agency_id} onChange={(event) => updateField("design_agency_id", event.target.value)} disabled={!canEdit || isSaving || isOptionsLoading}>
                <option value="">Select agency</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {designers.length === 0 && groups.length > 0 ? (
            <p className="text-xs text-amber-700">
              No individual designers found. You can assign the design group, or add an active Designer user with design permissions.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Assign a designer, design group, or agency before submitting.
            </p>
          )}
        </section>

        {canEdit ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => void handleSaveDraft()} disabled={isSaving}>
              Save Draft
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => void handleSubmit()} disabled={isSaving || !canSubmit}>
              Submit to Design
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Only the assigned Therapy Lead can edit and submit this design brief.
          </div>
        )}
      </div>
    </SummaryCard>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
