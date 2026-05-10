import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getCurrentUser, login as loginRequest } from "../api/auth";
import type { User } from "../types/auth";
import {
  AUTH_UNAUTHORIZED_EVENT,
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken,
} from "../utils/authStorage";


type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshCurrentUser: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  hasPermission: (permissionKey: string) => boolean;
  hasAnyPermission: (permissionKeys: string[]) => boolean;
};


const AuthContext = createContext<AuthContextValue | undefined>(undefined);


type AuthProviderProps = {
  children: ReactNode;
};


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredAuthToken();
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const storedToken = getStoredAuthToken();

    if (!storedToken) {
      logout();
      return;
    }

    setIsLoading(true);
    setToken(storedToken);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);

    setStoredAuthToken(response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const hasPermission = useCallback(
    (permissionKey: string) => {
      if (user?.is_superuser) {
        return true;
      }
      return Boolean(user?.permissions.includes(permissionKey));
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissionKeys: string[]) => permissionKeys.some((permissionKey) => hasPermission(permissionKey)),
    [hasPermission],
  );

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isSuperuser: Boolean(user?.is_superuser),
      isLoading,
      login,
      logout,
      refreshCurrentUser: loadCurrentUser,
      loadCurrentUser,
      hasPermission,
      hasAnyPermission,
    }),
    [hasAnyPermission, hasPermission, isLoading, loadCurrentUser, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
