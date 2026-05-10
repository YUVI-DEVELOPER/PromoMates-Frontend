import { Link } from "react-router-dom";

import { PERMISSIONS } from "../../utils/permissions";
import type { PermissionChecker } from "../../utils/access";
import { SummaryCard } from "../ui/SummaryCard";


type GuideStep = {
  label: string;
  description: string;
};

type RoleGuide = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionPath?: string;
  steps: GuideStep[];
};

type RoleFlowGuideProps = {
  hasPermission: PermissionChecker;
};


const actionButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";


const setupGuide: RoleGuide = {
  id: "setup",
  badge: "Admin",
  title: "Setup Dashboard",
  subtitle: "Prepare PromoCon roles, users, master data, and workflows before team operations begin.",
  actionLabel: "Open Setup Checklist",
  actionPath: "/admin/setup-checklist",
  steps: [
    { label: "Setup Checklist", description: "Validate required setup steps before daily operations." },
    { label: "Create Roles", description: "Define role scopes and mapped backend permissions." },
    { label: "Create Users", description: "Provision users with correct role access." },
    { label: "Master Data", description: "Maintain products, markets, channels, and controlled terms." },
    { label: "Lookup Values", description: "Maintain operational lookup values used by workflows." },
    { label: "Workflows", description: "Review lifecycle routing and stage ownership." },
  ],
};

const requesterGuide: RoleGuide = {
  id: "requester",
  badge: "Request",
  title: "Request Creator Dashboard",
  subtitle: "Drive new content requests from intake to regional evaluation.",
  actionLabel: "Create Content Request",
  actionPath: "/requests/create",
  steps: [
    { label: "Create Content Request", description: "Capture business objective, market, and timeline." },
    { label: "Continue Draft Requests", description: "Complete draft requests before submission." },
    { label: "Move Requests to Ready for MLR", description: "Progress request through therapy and marketing review." },
    { label: "Add Review Content", description: "Add review content tied to the request." },
    { label: "Submit MLR", description: "Submit review content into MLR review workflow." },
  ],
};

const reviewerGuide: RoleGuide = {
  id: "reviewer",
  badge: "MLR",
  title: "Reviewer Dashboard",
  subtitle: "Stay focused on your queue, review evidence, and submit clear decisions.",
  actionLabel: "Open My Queue",
  actionPath: "/tasks",
  steps: [
    { label: "Open My Queue", description: "Review assigned and available reviewer tasks." },
    { label: "Claim Available Task", description: "Claim eligible tasks in your role scope." },
    { label: "Review Content", description: "Evaluate submitted review content and supporting files." },
    { label: "Add Comments", description: "Capture actionable feedback for request owners." },
    { label: "Submit Decision", description: "Approve, request changes, or reject with rationale." },
  ],
};

const complianceGuide: RoleGuide = {
  id: "compliance",
  badge: "Compliance",
  title: "Compliance Dashboard",
  subtitle: "Complete checklist controls and issue MLR code for approved review outcomes.",
  actionLabel: "Open Requests",
  actionPath: "/requests?status=MLR_APPROVED",
  steps: [
    { label: "Review approved content", description: "Confirm content selected for compliance completion." },
    { label: "Complete checklist", description: "Fill required compliance checks and evidence fields." },
    { label: "Issue MLR Code", description: "Issue MLR code once checklist requirements are complete." },
  ],
};

const designGuide: RoleGuide = {
  id: "design",
  badge: "Design",
  title: "Design Dashboard",
  subtitle: "Manage design production handoff, draft uploads, and revision loops.",
  actionLabel: "Open Content Requests",
  actionPath: "/requests?status=DESIGN_IN_PROGRESS",
  steps: [
    { label: "Open Design Jobs", description: "Find requests sent to design with active jobs." },
    { label: "Upload Design Draft", description: "Upload draft output for design review." },
    { label: "Request Revision / Approve Design", description: "Route design to revision or approval." },
  ],
};

const finalApprovalGuide: RoleGuide = {
  id: "final_approval",
  badge: "Approval",
  title: "Final Approval Dashboard",
  subtitle: "Validate final design readiness and approve governed material records.",
  actionLabel: "Open Content Requests",
  actionPath: "/requests?status=FINAL_APPROVAL",
  steps: [
    { label: "Review final design", description: "Review approved design output and compliance linkage." },
    { label: "Grant Final Approval", description: "Approve request and generate locked approved material." },
    { label: "Confirm MAT Code", description: "Confirm final material code and validity details." },
  ],
};

const publisherGuide: RoleGuide = {
  id: "publisher",
  badge: "Distribution",
  title: "Publisher Dashboard",
  subtitle: "Package approved materials and release governed bundles to sales teams.",
  actionLabel: "Create Distribution Package",
  actionPath: "/distribution/create",
  steps: [
    { label: "Create Distribution Package", description: "Create package container and release window." },
    { label: "Add Approved Materials", description: "Attach approved materials with usage guidance." },
    { label: "Release Package", description: "Release package for downstream sales access." },
  ],
};

const salesGuide: RoleGuide = {
  id: "sales",
  badge: "Sales",
  title: "Sales Dashboard",
  subtitle: "Use only released approved materials and track usage activities.",
  actionLabel: "Open Sales Materials",
  actionPath: "/sales-materials",
  steps: [
    { label: "Open Sales Materials", description: "Access released materials available to your role." },
    { label: "View / Download / Share approved content", description: "Use tracked actions for approved package materials." },
  ],
};

const defaultGuide: RoleGuide = {
  id: "default",
  badge: "Dashboard",
  title: "Dashboard",
  subtitle: "No role-specific workflow is configured for this account yet.",
  steps: [
    { label: "Contact Admin", description: "Request role assignment and required permissions." },
  ],
};


function hasAdminAccess(hasPermission: PermissionChecker): boolean {
  return (
    hasPermission(PERMISSIONS.MANAGE_SYSTEM) ||
    hasPermission(PERMISSIONS.MANAGE_USERS) ||
    hasPermission(PERMISSIONS.MANAGE_MASTER_DATA)
  );
}


export function getRoleGuides(hasPermission: PermissionChecker): RoleGuide[] {
  const guides: RoleGuide[] = [];

  if (hasAdminAccess(hasPermission)) {
    guides.push(setupGuide);
  }

  if (hasPermission(PERMISSIONS.CREATE_REQUEST)) {
    guides.push(requesterGuide);
  }

  if (hasPermission(PERMISSIONS.REVIEW_MLR) && !hasPermission(PERMISSIONS.CREATE_REQUEST)) {
    guides.push(reviewerGuide);
  }

  if (hasPermission(PERMISSIONS.ISSUE_MLR_CODE)) {
    guides.push(complianceGuide);
  }

  if (hasPermission(PERMISSIONS.MANAGE_DESIGN)) {
    guides.push(designGuide);
  }

  if (hasPermission(PERMISSIONS.FINAL_APPROVE)) {
    guides.push(finalApprovalGuide);
  }

  if (
    hasPermission(PERMISSIONS.CREATE_DISTRIBUTION) ||
    hasPermission(PERMISSIONS.RELEASE_DISTRIBUTION)
  ) {
    guides.push(publisherGuide);
  }

  if (hasPermission(PERMISSIONS.ACCESS_SALES_MATERIALS)) {
    guides.push(salesGuide);
  }

  return guides.length > 0 ? guides : [defaultGuide];
}


export function getPrimaryRoleGuide(hasPermission: PermissionChecker): RoleGuide {
  return getRoleGuides(hasPermission)[0] ?? defaultGuide;
}


export function RoleFlowGuide({ hasPermission }: RoleFlowGuideProps) {
  const guides = getRoleGuides(hasPermission);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {guides.map((guide) => (
        <SummaryCard key={guide.id} title={guide.title} subtitle={guide.subtitle}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{guide.badge}</p>
            {guide.actionLabel && guide.actionPath ? (
              <Link to={guide.actionPath} className={actionButtonClass}>
                {guide.actionLabel}
              </Link>
            ) : null}
          </div>
          <ol className="mt-4 space-y-3">
            {guide.steps.map((step, index) => (
              <li key={`${guide.id}-${step.label}`} className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>
                <div className="pt-0.5">
                  <p className="font-semibold text-slate-900">{step.label}</p>
                  <p className="mt-1 leading-5 text-slate-600">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </SummaryCard>
      ))}
    </div>
  );
}
