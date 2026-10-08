import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
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
  hydrated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, role: "customer" | "stylist") => Promise<AuthUser>;
  logout: () => void;
  setAuth: (token: string, user: AuthUser) => void;
};

import { isTokenExpired, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./auth-utils";
export { isTokenExpired, TOKEN_STORAGE_KEY, USER_STORAGE_KEY };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted session on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [savedToken, savedUserJson] = await Promise.all([
          AsyncStorage.getItem(TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(USER_STORAGE_KEY),
        ]);
        if (!active) return;
        if (savedToken && savedUserJson) {
          if (isTokenExpired(savedToken)) {
            await Promise.all([
              AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
              AsyncStorage.removeItem(USER_STORAGE_KEY),
            ]);
            setToken(null);
            setUser(null);
          } else {
            const parsedUser = JSON.parse(savedUserJson) as AuthUser;
            setToken(savedToken);
            setUser(parsedUser);
          }
        }
      } catch {
        // Safe fallback if storage fails
      } finally {
        if (active) setHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const trimmedEmail = email.trim().toLowerCase();
    let response: Response;
    try {
      response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
    } catch {
      throw new Error("Không kết nối được Auth Service. Vui lòng kiểm tra mạng.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Email hoặc mật khẩu không chính xác.");
      }
      throw new Error(data.error || `Đăng nhập thất bại (${response.status})`);
    }

    const nextToken: string = data.accessToken;
    const nextUser: AuthUser = data.user;

    // Reject Shop Admin on mobile
    if (nextUser.role === "shop_admin") {
      throw new Error("Tài khoản Shop Admin chỉ dành cho Web Admin. Vui lòng truy cập trên trình duyệt máy tính.");
    }

    // Persist JWT token and user info (NEVER persist raw password)
    await Promise.all([
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, nextToken),
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser)),
    ]);

    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(
    async (email: string, password: string, role: "customer" | "stylist"): Promise<AuthUser> => {
      const trimmedEmail = email.trim().toLowerCase();
      if (password.length < 8) {
        throw new Error("Mật khẩu phải chứa ít nhất 8 ký tự.");
      }
      if (role !== "customer" && role !== "stylist") {
        throw new Error("Vai trò không hợp lệ trên ứng dụng Mobile.");
      }

      let response: Response;
      try {
        response = await fetch(`${AUTH_SERVICE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password, role }),
        });
      } catch {
        throw new Error("Không kết nối được Auth Service. Vui lòng kiểm tra mạng.");
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.");
        }
        throw new Error(data.error || `Đăng ký thất bại (${response.status})`);
      }

      // Automatically login to receive JWT and establish session
      return login(trimmedEmail, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    void Promise.all([
      AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
      AsyncStorage.removeItem(USER_STORAGE_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  const setAuth = useCallback((newToken: string, newUser: AuthUser) => {
    void Promise.all([
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken),
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const role = user?.role === "customer" || user?.role === "stylist" ? user.role : null;

  const value = useMemo(
    () => ({
      token,
      user,
      role,
      hydrated,
      login,
      register,
      logout,
      setAuth,
    }),
    [token, user, role, hydrated, login, register, logout, setAuth]
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

