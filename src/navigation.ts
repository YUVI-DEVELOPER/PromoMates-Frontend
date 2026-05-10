import type { PermissionChecker } from "./utils/access";
import {
  ADMIN_ACCESS_PERMISSIONS,
  APPROVED_MATERIALS_ACCESS_PERMISSIONS,
  DISTRIBUTION_ACCESS_PERMISSIONS,
  DOCUMENT_LIBRARY_ACCESS_PERMISSIONS,
  DESIGN_ACCESS_PERMISSIONS,
  MASTER_DATA_ACCESS_PERMISSIONS,
  REQUEST_ACCESS_PERMISSIONS,
  REVIEW_TASK_ACCESS_PERMISSIONS,
  ROLE_MANAGEMENT_ACCESS_PERMISSIONS,
  ROUTING_SETUP_ACCESS_PERMISSIONS,
  SALES_MATERIALS_ACCESS_PERMISSIONS,
} from "./utils/access";
import { PERMISSIONS } from "./utils/permissions";


export type WorkspaceModuleId =
  | "workspace"
  | "requests"
  | "reviews"
  | "content"
  | "design"
  | "approvals"
  | "distribution"
  | "sales"
  | "admin";


export type PermissionContext = {
  isSuperuser: boolean;
  hasPermission: PermissionChecker;
  hasAnyPermission: (permissionKeys: readonly string[]) => boolean;
};


export type DrawerPage = {
  label: string;
  path: string;
  description?: string;
  isVisible?: (context: PermissionContext) => boolean;
};


export type DrawerGroup = {
  label?: string;
  items: DrawerPage[];
};


export type WorkspaceModule = {
  id: WorkspaceModuleId;
  label: string;
  shortLabel: string;
  path: string;
  isVisible: (context: PermissionContext) => boolean;
  groups: DrawerGroup[];
};


export type WorkspaceTabDescriptor = {
  label: string;
  helperText?: string;
  isPinned?: boolean;
};


function hasAny(context: PermissionContext, permissionKeys: readonly string[]): boolean {
  return context.isSuperuser || context.hasAnyPermission(permissionKeys);
}


function canAccessContent(context: PermissionContext): boolean {
  return hasAny(context, DOCUMENT_LIBRARY_ACCESS_PERMISSIONS);
}


function canAccessApprovals(context: PermissionContext): boolean {
  return hasAny(context, [
    PERMISSIONS.ISSUE_MLR_CODE,
    PERMISSIONS.FINAL_APPROVE,
    PERMISSIONS.MANAGE_APPROVED_MATERIALS,
  ]);
}


function canAccessDistribution(context: PermissionContext): boolean {
  return hasAny(context, DISTRIBUTION_ACCESS_PERMISSIONS);
}


function canAccessRoleManagement(context: PermissionContext): boolean {
  return hasAny(context, ROLE_MANAGEMENT_ACCESS_PERMISSIONS);
}


function canAccessMasterData(context: PermissionContext): boolean {
  return hasAny(context, MASTER_DATA_ACCESS_PERMISSIONS);
}


function canAccessRoutingSetup(context: PermissionContext): boolean {
  return hasAny(context, ROUTING_SETUP_ACCESS_PERMISSIONS);
}


export const workspaceModules: WorkspaceModule[] = [
  {
    id: "workspace",
    label: "Dashboard",
    shortLabel: "DB",
    path: "/dashboard",
    isVisible: () => true,
    groups: [
      {
        items: [
          { label: "My Dashboard", path: "/dashboard", description: "Your role-based command center." },
          { label: "Pending Actions", path: "/dashboard?view=pending", description: "Work that needs attention." },
          { label: "Recent Items", path: "/dashboard?view=recent", description: "Recently opened work." },
        ],
      },
    ],
  },
  {
    id: "requests",
    label: "Content Requests",
    shortLabel: "CR",
    path: "/requests",
    isVisible: (context) => hasAny(context, REQUEST_ACCESS_PERMISSIONS),
    groups: [
      {
        items: [
          { label: "My Requests", path: "/requests?view=mine" },
          {
            label: "Regional Review Queue",
            path: "/requests?view=regional-review",
            isVisible: (context) =>
              hasAny(context, [
                PERMISSIONS.REGIONAL_EVALUATE_REQUEST,
                PERMISSIONS.VIEW_REGION_REQUESTS,
              ]),
          },
          { label: "Returned To Me", path: "/requests?view=returned" },
          {
            label: "All Content Requests",
            path: "/requests?view=all",
            isVisible: (context) =>
              hasAny(context, [
                PERMISSIONS.UPDATE_REQUEST,
                PERMISSIONS.VIEW_REGION_REQUESTS,
                PERMISSIONS.REGIONAL_EVALUATE_REQUEST,
              ]),
          },
          {
            label: "Draft Requests",
            path: "/requests?status=DRAFT",
            isVisible: (context) =>
              hasAny(context, [
                PERMISSIONS.CREATE_CONTENT_REQUEST,
                PERMISSIONS.CREATE_REQUEST,
                PERMISSIONS.SUBMIT_CONTENT_REQUEST,
                PERMISSIONS.UPDATE_REQUEST,
              ]),
          },
          {
            label: "Create Content Request",
            path: "/requests/create",
            isVisible: (context) => hasAny(context, [PERMISSIONS.CREATE_CONTENT_REQUEST, PERMISSIONS.CREATE_REQUEST]),
          },
        ],
      },
    ],
  },
  {
    id: "reviews",
    label: "Reviews",
    shortLabel: "RV",
    path: "/tasks",
    isVisible: (context) => hasAny(context, REVIEW_TASK_ACCESS_PERMISSIONS),
    groups: [
      {
        items: [
          { label: "My Review Queue", path: "/tasks?view=assigned" },
          { label: "Available Tasks", path: "/tasks?view=available" },
          { label: "Completed Reviews", path: "/tasks?view=completed" },
        ],
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    shortLabel: "CT",
    path: "/library",
    isVisible: canAccessContent,
    groups: [
      {
        items: [
          { label: "Content Library", path: "/library" },
          { label: "Linked Content", path: "/library?view=linked" },
          { label: "Content Versions", path: "/library?view=versions" },
          {
            label: "Upload Center",
            path: "/library/create",
            isVisible: (context) => hasAny(context, [PERMISSIONS.CREATE_REQUEST]),
          },
        ],
      },
    ],
  },
  {
    id: "design",
    label: "Design",
    shortLabel: "DS",
    path: "/design/tasks",
    isVisible: (context) => hasAny(context, DESIGN_ACCESS_PERMISSIONS),
    groups: [
      {
        items: [
          {
            label: "My Design Reviews",
            path: "/design/reviews",
            isVisible: (context) => hasAny(context, [PERMISSIONS.REVIEW_DESIGN_DRAFT]),
          },
          {
            label: "My Design Tasks",
            path: "/design/tasks",
            isVisible: (context) => hasAny(context, [PERMISSIONS.MANAGE_DESIGN, PERMISSIONS.UPLOAD_DESIGN_DRAFT]),
          },
          { label: "Submitted Briefs", path: "/requests?status=DESIGN_BRIEF_SUBMITTED" },
          {
            label: "Design Jobs",
            path: "/requests?status=DESIGN_IN_PROGRESS",
            isVisible: (context) => hasAny(context, [PERMISSIONS.MANAGE_DESIGN, PERMISSIONS.UPLOAD_DESIGN_DRAFT]),
          },
          {
            label: "Pending Uploads",
            path: "/requests?status=DESIGN_IN_PROGRESS&view=pending-uploads",
            isVisible: (context) => hasAny(context, [PERMISSIONS.MANAGE_DESIGN, PERMISSIONS.UPLOAD_DESIGN_DRAFT]),
          },
          {
            label: "Revision Requests",
            path: "/requests?status=DESIGN_REVIEW&view=revisions",
            isVisible: (context) => hasAny(context, [PERMISSIONS.MANAGE_DESIGN]),
          },
          {
            label: "Approved Designs",
            path: "/requests?status=FINAL_APPROVAL",
            isVisible: (context) => hasAny(context, [PERMISSIONS.MANAGE_DESIGN]),
          },
        ],
      },
    ],
  },
  {
    id: "approvals",
    label: "Approvals",
    shortLabel: "AP",
    path: "/requests?status=MLR_APPROVED",
    isVisible: canAccessApprovals,
    groups: [
      {
        items: [
          {
            label: "Compliance Checklist",
            path: "/requests?status=MLR_APPROVED",
            isVisible: (context) => hasAny(context, [PERMISSIONS.ISSUE_MLR_CODE]),
          },
          {
            label: "MLR Code Issuance",
            path: "/requests?status=MLR_APPROVED&view=code-issuance",
            isVisible: (context) => hasAny(context, [PERMISSIONS.ISSUE_MLR_CODE]),
          },
          {
            label: "Final Approval",
            path: "/requests?status=FINAL_APPROVAL",
            isVisible: (context) => hasAny(context, [PERMISSIONS.FINAL_APPROVE]),
          },
          {
            label: "Approved Materials",
            path: "/approved-materials",
            isVisible: (context) => hasAny(context, APPROVED_MATERIALS_ACCESS_PERMISSIONS),
          },
        ],
      },
    ],
  },
  {
    id: "distribution",
    label: "Distribution",
    shortLabel: "DN",
    path: "/distribution",
    isVisible: canAccessDistribution,
    groups: [
      {
        items: [
          { label: "Distribution Packages", path: "/distribution" },
          {
            label: "Create Package",
            path: "/distribution/create",
            isVisible: (context) => hasAny(context, [PERMISSIONS.CREATE_DISTRIBUTION]),
          },
          { label: "Released Packages", path: "/distribution?status=RELEASED" },
          { label: "Withdrawn Packages", path: "/distribution?status=WITHDRAWN" },
        ],
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    shortLabel: "SL",
    path: "/sales-materials",
    isVisible: (context) => hasAny(context, SALES_MATERIALS_ACCESS_PERMISSIONS),
    groups: [
      {
        items: [
          { label: "My Sales Materials", path: "/sales-materials" },
          { label: "Recent Access", path: "/sales-materials?view=recent" },
          { label: "Shared Materials", path: "/sales-materials?view=shared" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    shortLabel: "AD",
    path: "/admin/setup-checklist",
    isVisible: (context) => hasAny(context, ADMIN_ACCESS_PERMISSIONS) || canAccessRoutingSetup(context),
    groups: [
      {
        label: "Setup",
        items: [
          {
            label: "Setup Checklist",
            path: "/admin/setup-checklist",
            isVisible: (context) => hasAny(context, ADMIN_ACCESS_PERMISSIONS),
          },
          {
            label: "System Overview",
            path: "/admin",
            isVisible: (context) => hasAny(context, ADMIN_ACCESS_PERMISSIONS),
          },
        ],
      },
      {
        label: "Access Control",
        items: [
          { label: "Users", path: "/admin/users", isVisible: canAccessRoleManagement },
          { label: "Roles", path: "/admin/roles", isVisible: canAccessRoleManagement },
          { label: "Permissions", path: "/admin/roles?view=permissions", isVisible: canAccessRoleManagement },
          { label: "User Groups", path: "/admin/user-groups", isVisible: canAccessRoleManagement },
        ],
      },
      {
        label: "Configuration",
        items: [
          { label: "Master Data", path: "/admin/master-data", isVisible: canAccessMasterData },
          { label: "Lookup Values", path: "/admin/lookups", isVisible: canAccessMasterData },
          { label: "Workflows", path: "/admin/workflows", isVisible: canAccessMasterData },
          { label: "Routing Setup", path: "/admin/routing", isVisible: canAccessRoutingSetup },
          {
            label: "Document Numbering",
            path: "/admin/document-numbering",
            isVisible: (context) => hasAny(context, ADMIN_ACCESS_PERMISSIONS),
          },
          {
            label: "Compliance Settings",
            path: "/admin/compliance-settings",
            isVisible: (context) => hasAny(context, ADMIN_ACCESS_PERMISSIONS),
          },
        ],
      },
    ],
  },
];


export const masterDataModules = [
  {
    label: "Brands",
    path: "/admin/master-data/brands",
    description: "Company or therapy-area brand families.",
  },
  {
    label: "Products",
    path: "/admin/master-data/products",
    description: "Products associated with configured brands.",
  },
  {
    label: "Regions",
    path: "/admin/master-data/regions",
    description: "Regional operating groups for localization and request routing.",
  },
  {
    label: "Therapeutic Areas",
    path: "/admin/master-data/therapeutic-areas",
    description: "Therapy-area taxonomy for product and campaign alignment.",
  },
  {
    label: "Sub-Therapy Areas",
    path: "/admin/master-data/sub-therapy-areas",
    description: "Sub-therapy taxonomy for routing specificity.",
  },
  {
    label: "Campaigns",
    path: "/admin/master-data/campaigns",
    description: "Campaign planning references for request workflows.",
  },
  {
    label: "Design Agencies",
    path: "/admin/master-data/design-agencies",
    description: "Internal and external creative partners.",
  },
  {
    label: "Countries",
    path: "/admin/master-data/countries",
    description: "Markets where materials can be submitted or used.",
  },
  {
    label: "Languages",
    path: "/admin/master-data/languages",
    description: "Content languages available for promotional materials.",
  },
  {
    label: "Document Types",
    path: "/admin/master-data/document-types",
    description: "High-level document categories configured by admins.",
  },
  {
    label: "Document Subtypes",
    path: "/admin/master-data/document-subtypes",
    description: "Document formats configured under document types.",
  },
  {
    label: "Channels",
    path: "/admin/master-data/channels",
    description: "Admin-defined communication channels.",
  },
  {
    label: "Audiences",
    path: "/admin/master-data/audiences",
    description: "Admin-defined target audience groups.",
  },
];


const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/requests": "Content Requests",
  "/approved-materials": "Approved Materials",
  "/distribution": "Distribution Packages",
  "/distribution/create": "Create Package",
  "/sales-materials": "Sales Materials",
  "/requests/create": "Create Content Request",
  "/library": "Content Library",
  "/library/create": "Create Review Document",
  "/documents/create": "Create Review Document",
  "/tasks": "My Review Queue",
  "/claims": "Claims Library",
  "/reports": "Reports",
  "/admin": "System Overview",
  "/admin/users": "Users",
  "/admin/roles": "Roles",
  "/admin/user-groups": "User Groups",
  "/admin/master-data": "Master Data",
  "/admin/lookups": "Lookup Values",
  "/admin/setup-checklist": "Setup Checklist",
  "/admin/master-data/brands": "Brands",
  "/admin/master-data/products": "Products",
  "/admin/master-data/regions": "Regions",
  "/admin/master-data/therapeutic-areas": "Therapeutic Areas",
  "/admin/master-data/sub-therapy-areas": "Sub-Therapy Areas",
  "/admin/routing": "Routing Setup",
  "/admin/master-data/campaigns": "Campaigns",
  "/admin/master-data/design-agencies": "Design Agencies",
  "/admin/master-data/countries": "Countries",
  "/admin/master-data/languages": "Languages",
  "/admin/master-data/document-types": "Document Types",
  "/admin/master-data/document-subtypes": "Document Subtypes",
  "/admin/master-data/channels": "Channels",
  "/admin/master-data/audiences": "Audiences",
  "/admin/workflows": "Workflows",
  "/admin/document-numbering": "Document Numbering",
  "/admin/compliance-settings": "Compliance Settings",
  "/health": "System Health",
};


const queryTabLabels: Record<string, string> = {
  "/dashboard?view=pending": "Pending Actions",
  "/dashboard?view=recent": "Recent Items",
  "/requests?view=mine": "My Requests",
  "/requests?view=therapy-tasks": "My Requests",
  "/requests?view=medical-review-tasks": "My Requests",
  "/requests?assigned_to_me=true": "My Requests",
  "/requests?view=regional-review": "Regional Review Queue",
  "/requests?view=returned": "Returned To Me",
  "/requests?view=all": "All Content Requests",
  "/requests?status=DRAFT": "Draft Requests",
  "/design/tasks": "My Design Tasks",
  "/design/reviews": "My Design Reviews",
  "/requests?status=DESIGN_BRIEF_SUBMITTED": "Submitted Briefs",
  "/requests?status=DESIGN_IN_PROGRESS": "Design Jobs",
  "/requests?status=DESIGN_IN_PROGRESS&view=pending-uploads": "Pending Uploads",
  "/requests?status=DESIGN_REVIEW&view=revisions": "Revision Requests",
  "/requests?status=FINAL_APPROVAL": "Final Approval",
  "/requests?status=MLR_APPROVED": "Compliance Checklist",
  "/requests?status=MLR_APPROVED&view=code-issuance": "MLR Code Issuance",
  "/distribution?status=RELEASED": "Released Packages",
  "/distribution?status=WITHDRAWN": "Withdrawn Packages",
  "/sales-materials?view=recent": "Recent Access",
  "/sales-materials?view=shared": "Shared Materials",
  "/library?view=linked": "Linked Content",
  "/library?view=versions": "Content Versions",
  "/tasks?view=assigned": "My Review Queue",
  "/tasks?view=available": "Available Tasks",
  "/tasks?view=completed": "Completed Reviews",
  "/admin/roles?view=permissions": "Permissions",
};


export function createPermissionContext(context: PermissionContext): PermissionContext {
  return context;
}


export function getVisibleWorkspaceModules(context: PermissionContext): WorkspaceModule[] {
  return workspaceModules.filter((module) => module.isVisible(context));
}


export function getVisibleDrawerGroups(moduleId: WorkspaceModuleId, context: PermissionContext): DrawerGroup[] {
  const module = workspaceModules.find((candidate) => candidate.id === moduleId);
  if (!module) {
    return [];
  }

  return module.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.isVisible || item.isVisible(context)),
    }))
    .filter((group) => group.items.length > 0);
}


export function getDefaultPathForModule(moduleId: WorkspaceModuleId, context: PermissionContext): string {
  const groups = getVisibleDrawerGroups(moduleId, context);
  return groups[0]?.items[0]?.path ?? workspaceModules.find((module) => module.id === moduleId)?.path ?? "/dashboard";
}


export function getModuleIdForPath(pathname: string, search = ""): WorkspaceModuleId {
  if (pathname === "/dashboard") {
    return "workspace";
  }
  if (pathname.startsWith("/admin")) {
    return "admin";
  }
  if (pathname.startsWith("/tasks")) {
    return "reviews";
  }
  if (pathname.startsWith("/design")) {
    return "design";
  }
  if (pathname.startsWith("/library") || pathname.startsWith("/documents") || pathname.startsWith("/claims")) {
    return "content";
  }
  if (pathname.startsWith("/distribution")) {
    return "distribution";
  }
  if (pathname.startsWith("/sales-materials")) {
    return "sales";
  }
  if (pathname.startsWith("/approved-materials")) {
    return "approvals";
  }
  if (pathname.startsWith("/requests")) {
    const params = new URLSearchParams(search);
    const status = params.get("status");
    if (status?.startsWith("DESIGN")) {
      return "design";
    }
    if (status === "MLR_APPROVED" || status === "FINAL_APPROVAL") {
      return "approvals";
    }
    return "requests";
  }
  return "workspace";
}


export function getPageTitle(pathname: string): string {
  if (/^\/requests\/[^/]+\/medical-review$/.test(pathname)) {
    return "Medical Content Review";
  }

  if (/^\/requests\/[^/]+\/edit$/.test(pathname)) {
    return "Edit Request";
  }

  if (/^\/requests\/[^/]+$/.test(pathname)) {
    return "Request Detail";
  }

  if (/^\/approved-materials\/[^/]+$/.test(pathname)) {
    return "Approved Material Detail";
  }

  if (/^\/distribution\/[^/]+$/.test(pathname)) {
    return "Distribution Package Detail";
  }

  if (/^\/library\/\d+\/edit$/.test(pathname)) {
    return "Edit Review Content";
  }

  if (/^\/library\/\d+$/.test(pathname)) {
    return "Review Content Detail";
  }

  if (/^\/tasks\/\d+$/.test(pathname)) {
    return "Review Task Detail";
  }

  if (pathname === "/design/tasks") {
    return "My Design Tasks";
  }
  if (pathname === "/design/reviews") {
    return "My Design Reviews";
  }

  return pageTitles[pathname] ?? "PromoCon";
}


export function getWorkspaceTabDescriptor(pathname: string, search = ""): WorkspaceTabDescriptor {
  const pathWithSearch = `${pathname}${search}`;
  const queryLabel = queryTabLabels[pathWithSearch];

  if (queryLabel) {
    return { label: queryLabel, isPinned: pathWithSearch === "/dashboard" };
  }

  if (/^\/requests\/[^/]+$/.test(pathname)) {
    const id = pathname.split("/").pop();
    return { label: `Request ${id}`, helperText: "Request record", isPinned: false };
  }

  if (/^\/requests\/[^/]+\/medical-review$/.test(pathname)) {
    const id = pathname.split("/").slice(-2)[0];
    return { label: `Medical Review ${id}`, helperText: "Medical Content Review", isPinned: false };
  }

  if (/^\/requests\/[^/]+\/edit$/.test(pathname)) {
    return { label: "Edit Request", helperText: "Unsaved changes are marked in the tab.", isPinned: false };
  }

  if (/^\/library\/\d+$/.test(pathname)) {
    const id = pathname.split("/").pop();
    return { label: `Content ${id}`, helperText: "Review content record", isPinned: false };
  }

  if (/^\/tasks\/\d+$/.test(pathname)) {
    const id = pathname.split("/").pop();
    return { label: `Task ${id}`, helperText: "Review task record", isPinned: false };
  }

  if (/^\/distribution\/[^/]+$/.test(pathname)) {
    const id = pathname.split("/").pop();
    return { label: `Package ${id}`, helperText: "Distribution package", isPinned: false };
  }

  return {
    label: getPageTitle(pathname),
    isPinned: pathname === "/dashboard",
  };
}
