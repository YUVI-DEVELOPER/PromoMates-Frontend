import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { ClaimsLibrary } from "../pages/ClaimsLibrary";
import { Dashboard } from "../pages/Dashboard";
import { DocumentLibrary } from "../pages/DocumentLibrary";
import { HealthCheck } from "../pages/HealthCheck";
import { Login } from "../pages/Login";
import { MyTasks } from "../pages/MyTasks";
import { Reports } from "../pages/Reports";
import { Users } from "../pages/Users";
import { AdminConsole } from "../pages/admin/AdminConsole";
import { ComplianceSettings } from "../pages/admin/ComplianceSettings";
import { DocumentNumbering } from "../pages/admin/DocumentNumbering";
import { LookupMaster } from "../pages/admin/LookupMaster";
import { MasterDataLanding } from "../pages/admin/MasterDataLanding";
import { RoleMaster } from "../pages/admin/RoleMaster";
import { SetupChecklist } from "../pages/admin/SetupChecklist";
import { RoutingSetup } from "../pages/admin/RoutingSetup";
import { UserGroups } from "../pages/admin/UserGroups";
import { WorkflowSettings } from "../pages/admin/WorkflowSettings";
import { ApprovedMaterialDetail } from "../pages/approved-materials/ApprovedMaterialDetail";
import { ApprovedMaterials } from "../pages/approved-materials/ApprovedMaterials";
import { AudiencesPage } from "../pages/admin/master-data/AudiencesPage";
import { BrandsPage } from "../pages/admin/master-data/BrandsPage";
import { CampaignsPage } from "../pages/admin/master-data/CampaignsPage";
import { ChannelsPage } from "../pages/admin/master-data/ChannelsPage";
import { CountriesPage } from "../pages/admin/master-data/CountriesPage";
import { DesignAgenciesPage } from "../pages/admin/master-data/DesignAgenciesPage";
import { DocumentSubtypesPage } from "../pages/admin/master-data/DocumentSubtypesPage";
import { DocumentTypesPage } from "../pages/admin/master-data/DocumentTypesPage";
import { LanguagesPage } from "../pages/admin/master-data/LanguagesPage";
import { ProductsPage } from "../pages/admin/master-data/ProductsPage";
import { RegionsPage } from "../pages/admin/master-data/RegionsPage";
import { SubTherapyAreasPage } from "../pages/admin/master-data/SubTherapyAreasPage";
import { TherapeuticAreasPage } from "../pages/admin/master-data/TherapeuticAreasPage";
import { CreateDocument } from "../pages/documents/CreateDocument";
import { ContentAuthoringStudio } from "../pages/documents/ContentAuthoringStudio";
import { DocumentDetail } from "../pages/documents/DocumentDetail";
import { EditDocument } from "../pages/documents/EditDocument";
import { CreateDistributionPackage } from "../pages/distribution/CreateDistributionPackage";
import { DistributionPackageDetail } from "../pages/distribution/DistributionPackageDetail";
import { DistributionPackages } from "../pages/distribution/DistributionPackages";
import { SalesMaterials } from "../pages/distribution/SalesMaterials";
import { DesignProduction } from "../pages/design/DesignProduction";
import { MyDesignReviews } from "../pages/design/MyDesignReviews";
import { MyDesignTasks } from "../pages/design/MyDesignTasks";
import { CreateMaterialRequest } from "../pages/requests/CreateMaterialRequest";
import { EditMaterialRequest } from "../pages/requests/EditMaterialRequest";
import { MaterialRequestDetail } from "../pages/requests/MaterialRequestDetail";
import { MaterialRequests } from "../pages/requests/MaterialRequests";
import { MedicalReviewDetail } from "../pages/requests/MedicalReviewDetail";
import { TaskDetail } from "../pages/tasks/TaskDetail";
import { ProtectedRoute } from "./ProtectedRoute";
import {
  ADMIN_ACCESS_PERMISSIONS,
  APPROVED_MATERIALS_ACCESS_PERMISSIONS,
  DESIGN_ACCESS_PERMISSIONS,
  DISTRIBUTION_ACCESS_PERMISSIONS,
  DOCUMENT_LIBRARY_ACCESS_PERMISSIONS,
  MASTER_DATA_ACCESS_PERMISSIONS,
  REQUEST_DETAIL_ACCESS_PERMISSIONS,
  REQUEST_ACCESS_PERMISSIONS,
  REVIEW_TASK_ACCESS_PERMISSIONS,
  ROLE_MANAGEMENT_ACCESS_PERMISSIONS,
  ROUTING_SETUP_ACCESS_PERMISSIONS,
  SALES_MATERIALS_ACCESS_PERMISSIONS,
} from "../utils/access";
import { PERMISSIONS } from "../utils/permissions";


function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm font-medium text-slate-600">
        Loading...
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}


export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/health" element={<HealthCheck />} />
      <Route
        path="/approved-materials"
        element={
          <ProtectedRoute requireAnyPermission={APPROVED_MATERIALS_ACCESS_PERMISSIONS}>
            <ApprovedMaterials />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approved-materials/:materialId"
        element={
          <ProtectedRoute requireAnyPermission={APPROVED_MATERIALS_ACCESS_PERMISSIONS}>
            <ApprovedMaterialDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/distribution"
        element={
          <ProtectedRoute requireAnyPermission={DISTRIBUTION_ACCESS_PERMISSIONS}>
            <DistributionPackages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/distribution/create"
        element={
          <ProtectedRoute requireAnyPermission={DISTRIBUTION_ACCESS_PERMISSIONS}>
            <CreateDistributionPackage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/distribution/:packageId"
        element={
          <ProtectedRoute requireAnyPermission={DISTRIBUTION_ACCESS_PERMISSIONS}>
            <DistributionPackageDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-materials"
        element={
          <ProtectedRoute requireAnyPermission={SALES_MATERIALS_ACCESS_PERMISSIONS}>
            <SalesMaterials />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <ProtectedRoute requireAnyPermission={REQUEST_DETAIL_ACCESS_PERMISSIONS}>
            <MaterialRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/create"
        element={
          <ProtectedRoute requireAnyPermission={[PERMISSIONS.CREATE_CONTENT_REQUEST, PERMISSIONS.CREATE_REQUEST]}>
            <CreateMaterialRequest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:requestId/medical-review"
        element={
          <ProtectedRoute
            requireAnyPermission={[
              PERMISSIONS.REVIEW_MEDICAL_CONTENT,
              PERMISSIONS.VIEW_THERAPY_PIPELINE,
              PERMISSIONS.AUTHOR_CONTENT,
              PERMISSIONS.CREATE_CONTENT_DRAFT,
            ]}
          >
            <MedicalReviewDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:requestId/design"
        element={
          <ProtectedRoute requireAnyPermission={DESIGN_ACCESS_PERMISSIONS}>
            <DesignProduction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:requestId"
        element={
          <ProtectedRoute requireAnyPermission={REQUEST_DETAIL_ACCESS_PERMISSIONS}>
            <MaterialRequestDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:requestId/edit"
        element={
          <ProtectedRoute requireAnyPermission={REQUEST_ACCESS_PERMISSIONS}>
            <EditMaterialRequest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute requireAnyPermission={DOCUMENT_LIBRARY_ACCESS_PERMISSIONS}>
            <DocumentLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/create"
        element={
          <ProtectedRoute requireAnyPermission={[PERMISSIONS.CREATE_REQUEST]}>
            <CreateDocument />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:documentId"
        element={
          <ProtectedRoute requireAnyPermission={DOCUMENT_LIBRARY_ACCESS_PERMISSIONS}>
            <DocumentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:documentId/edit"
        element={
          <ProtectedRoute requireAnyPermission={DOCUMENT_LIBRARY_ACCESS_PERMISSIONS}>
            <EditDocument />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:documentId/authoring"
        element={
          <ProtectedRoute
            requireAnyPermission={[
              PERMISSIONS.AUTHOR_CONTENT,
              PERMISSIONS.CREATE_CONTENT_DRAFT,
              PERMISSIONS.MANAGE_CONTENT_VERSIONS,
            ]}
          >
            <ContentAuthoringStudio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content-workspaces/:contentWorkspaceId/authoring"
        element={
          <ProtectedRoute
            requireAnyPermission={[
              PERMISSIONS.AUTHOR_CONTENT,
              PERMISSIONS.CREATE_CONTENT_DRAFT,
              PERMISSIONS.MANAGE_CONTENT_VERSIONS,
            ]}
          >
            <ContentAuthoringStudio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library/create"
        element={
          <ProtectedRoute requireAnyPermission={[PERMISSIONS.CREATE_REQUEST]}>
            <CreateDocument />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library/:documentId"
        element={
          <ProtectedRoute requireAnyPermission={DOCUMENT_LIBRARY_ACCESS_PERMISSIONS}>
            <DocumentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library/:documentId/edit"
        element={
          <ProtectedRoute requireAnyPermission={DOCUMENT_LIBRARY_ACCESS_PERMISSIONS}>
            <EditDocument />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute requireAnyPermission={REVIEW_TASK_ACCESS_PERMISSIONS}>
            <MyTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:taskId"
        element={
          <ProtectedRoute requireAnyPermission={REVIEW_TASK_ACCESS_PERMISSIONS}>
            <TaskDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/design/tasks"
        element={
          <ProtectedRoute requireAnyPermission={DESIGN_ACCESS_PERMISSIONS}>
            <MyDesignTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/design/reviews"
        element={
          <ProtectedRoute requireAnyPermission={DESIGN_ACCESS_PERMISSIONS}>
            <MyDesignReviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedRoute requireAnyPermission={DOCUMENT_LIBRARY_ACCESS_PERMISSIONS}>
            <ClaimsLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute requireAnyPermission={ADMIN_ACCESS_PERMISSIONS}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAnyPermission={ADMIN_ACCESS_PERMISSIONS}>
            <AdminConsole />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requireAnyPermission={ROLE_MANAGEMENT_ACCESS_PERMISSIONS}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute requireAnyPermission={ROLE_MANAGEMENT_ACCESS_PERMISSIONS}>
            <RoleMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/user-groups"
        element={
          <ProtectedRoute requireAnyPermission={ROLE_MANAGEMENT_ACCESS_PERMISSIONS}>
            <UserGroups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/routing"
        element={
          <ProtectedRoute requireAnyPermission={ROUTING_SETUP_ACCESS_PERMISSIONS}>
            <RoutingSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <MasterDataLanding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/lookups"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <LookupMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/setup-checklist"
        element={
          <ProtectedRoute requireAnyPermission={ADMIN_ACCESS_PERMISSIONS}>
            <SetupChecklist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/brands"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <BrandsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/products"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/regions"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <RegionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/therapeutic-areas"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <TherapeuticAreasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/sub-therapy-areas"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <SubTherapyAreasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/campaigns"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <CampaignsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/design-agencies"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <DesignAgenciesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/countries"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <CountriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/languages"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <LanguagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/document-types"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <DocumentTypesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/document-subtypes"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <DocumentSubtypesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/channels"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <ChannelsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/master-data/audiences"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <AudiencesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workflows"
        element={
          <ProtectedRoute requireAnyPermission={MASTER_DATA_ACCESS_PERMISSIONS}>
            <WorkflowSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/document-numbering"
        element={
          <ProtectedRoute requireAnyPermission={ADMIN_ACCESS_PERMISSIONS}>
            <DocumentNumbering />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/compliance-settings"
        element={
          <ProtectedRoute requireAnyPermission={ADMIN_ACCESS_PERMISSIONS}>
            <ComplianceSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={<Navigate to="/admin/users" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
