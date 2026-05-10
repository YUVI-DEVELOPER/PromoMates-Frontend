import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { WorkspaceTabsProvider } from "./context/WorkspaceTabsContext";
import { AppLayout } from "./layouts/AppLayout";
import { AppRoutes } from "./routes/AppRoutes";


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceTabsProvider>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </WorkspaceTabsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
