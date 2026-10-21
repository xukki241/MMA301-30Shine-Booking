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

export type AuthRole = "customer" | "stylist" | "system_admin" | "general_manager";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  phoneVerified?: boolean;
  role: AuthRole;
};

export type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  role: "customer" | "stylist" | "general_manager" | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  enterCustomer: (name: string, phone: string) => Promise<AuthUser>;
  requestCustomerRecovery: () => Promise<void>;
  verifyCustomerRecovery: (code: string) => Promise<void>;
  logout: () => Promise<void> | void;
  setAuth: (token: string, user: AuthUser) => void;
};

import { isMobileStaffRole, isTokenExpired, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./auth-utils";
export { isTokenExpired, TOKEN_STORAGE_KEY, USER_STORAGE_KEY };

const AuthContext = createContext<AuthContextValue | null>(null);
const CUSTOMER_DEVICE_KEY = "@shine:auth:customer-device";

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted session on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [savedToken, savedUserJson, deviceSecret] = await Promise.all([
          AsyncStorage.getItem(TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(USER_STORAGE_KEY),
          AsyncStorage.getItem(CUSTOMER_DEVICE_KEY),
        ]);
        if (!active) return;
        if (savedToken && savedUserJson && !isTokenExpired(savedToken)) {
            const parsedUser = JSON.parse(savedUserJson) as AuthUser;
            if (parsedUser.role === "customer") {
              setToken(savedToken);
              setUser(parsedUser);
            } else if (isMobileStaffRole(parsedUser.role)) {
              const response = await fetch(`${AUTH_SERVICE_URL}/auth/introspect`, {
                headers: { Authorization: `Bearer ${savedToken}` },
              });
              if (response.ok) {
                const data = await response.json() as { user: AuthUser };
                if (active && data.user.role === parsedUser.role && data.user.id === parsedUser.id) {
                  setToken(savedToken);
                  setUser(data.user);
                }
              } else if (response.status === 401) {
                await Promise.all([AsyncStorage.removeItem(TOKEN_STORAGE_KEY), AsyncStorage.removeItem(USER_STORAGE_KEY)]);
              }
            } else {
              await Promise.all([AsyncStorage.removeItem(TOKEN_STORAGE_KEY), AsyncStorage.removeItem(USER_STORAGE_KEY)]);
            }
        } else if (deviceSecret) {
          const response = await fetch(`${AUTH_SERVICE_URL}/auth/customer/resume`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceSecret }),
          });
          if (response.ok) {
            const data = await response.json();
            if (active) {
              setToken(data.accessToken);
              setUser(data.user);
              await Promise.all([
                AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken),
                AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user)),
              ]);
            }
          } else if (response.status === 401) {
            await AsyncStorage.removeItem(CUSTOMER_DEVICE_KEY);
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

  // Keep a guest session usable when the app stays open beyond the JWT lifetime.
  useEffect(() => {
    if (user?.role !== "customer" || !user.phone) return;
    const timer = setInterval(() => {
      void (async () => {
        const deviceSecret = await AsyncStorage.getItem(CUSTOMER_DEVICE_KEY);
        if (!deviceSecret) return;
        const response = await fetch(`${AUTH_SERVICE_URL}/auth/customer/resume`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceSecret }),
        });
        if (!response.ok) return;
        const data = await response.json();
        await Promise.all([
          AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken),
          AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user)),
        ]);
        setToken(data.accessToken);
        setUser(data.user);
      })().catch(() => { /* Retry on the next interval after a network failure. */ });
    }, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [user?.role, user?.phone]);

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

    // Customer sessions use name + phone. Staff credentials remain separate.
    if (!isMobileStaffRole(nextUser.role)) {
      throw new Error("App nhân sự chỉ dành cho Stylist và General Manager.");
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

  const enterCustomer = useCallback(async (name: string, phone: string): Promise<AuthUser> => {
    let response: Response;
    try {
      response = await fetch(`${AUTH_SERVICE_URL}/auth/customer/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
    } catch { throw new Error("Không kết nối được Auth Service."); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Không thể bắt đầu phiên khách.");
    await Promise.all([
      AsyncStorage.setItem(CUSTOMER_DEVICE_KEY, data.deviceSecret),
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken),
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user)),
    ]);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const requestCustomerRecovery = useCallback(async () => {
    if (!user?.phone) throw new Error("Vui lòng bắt đầu bằng tên và số điện thoại.");
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/customer/recovery/request`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: user.phone }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Không thể tạo mã khôi phục.");
  }, [user?.phone]);

  const verifyCustomerRecovery = useCallback(async (code: string) => {
    const deviceSecret = await AsyncStorage.getItem(CUSTOMER_DEVICE_KEY);
    if (!user?.phone || !deviceSecret) throw new Error("Phiên khách không hợp lệ.");
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/customer/recovery/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: user.phone, code, deviceSecret }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Mã khôi phục không đúng.");
    await Promise.all([
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken),
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user)),
    ]);
    setToken(data.accessToken);
    setUser(data.user);
  }, [user?.phone]);

  const logout = useCallback(() => {
    void Promise.all([
      AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
      AsyncStorage.removeItem(USER_STORAGE_KEY),
      AsyncStorage.removeItem(CUSTOMER_DEVICE_KEY),
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

  const role = user?.role === "customer" || user?.role === "stylist" || user?.role === "general_manager" ? user.role : null;

  const value = useMemo(
    () => ({
      token,
      user,
      role,
      hydrated,
      login,
      enterCustomer,
      requestCustomerRecovery,
      verifyCustomerRecovery,
      logout,
      setAuth,
    }),
    [token, user, role, hydrated, login, enterCustomer, requestCustomerRecovery, verifyCustomerRecovery, logout, setAuth]
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

