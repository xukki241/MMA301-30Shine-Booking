import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AUTH_SERVICE_URL } from "@/constants/config";

export type AuthRole = "customer" | "stylist" | "shop_admin";

export type AuthUser = {
  id: string;
  email: string;
  role: AuthRole;
};

export type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  role: "customer" | "stylist" | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  setAuth: (token: string, user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const trimmedEmail = email.trim().toLowerCase();
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmedEmail, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Đăng nhập thất bại (${response.status})`);
    }

    const nextToken: string = data.accessToken;
    const nextUser: AuthUser = data.user;

    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const setAuth = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
  }, []);

  const role = user?.role === "customer" || user?.role === "stylist" ? user.role : null;

  const value = useMemo(
    () => ({
      token,
      user,
      role,
      login,
      logout,
      setAuth,
    }),
    [token, user, role, login, logout, setAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
