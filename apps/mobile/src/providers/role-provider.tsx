import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState
} from "react";

export type MobileRole = "customer" | "stylist";

type RoleContextValue = {
  role: MobileRole | null;
  selectRole: (role: MobileRole) => void;
  clearRole: () => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<MobileRole | null>(null);
  const value = useMemo(
    () => ({ role, selectRole: setRole, clearRole: () => setRole(null) }),
    [role]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);

  if (!context) {
    throw new Error("useRole must be used inside RoleProvider");
  }

  return context;
}
