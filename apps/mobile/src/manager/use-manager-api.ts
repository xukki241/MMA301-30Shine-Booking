import { useMemo } from "react";
import { router } from "expo-router";
import { useAuth } from "@/providers/auth-provider";
import { useRole } from "@/providers/role-provider";
import { createManagerApi } from "./api";

export function useManagerApi() {
  const { token, logout } = useAuth();
  const { clearRole } = useRole();
  return useMemo(() => createManagerApi(() => token, () => {
    logout();
    clearRole();
    router.replace("/login");
  }), [token, logout, clearRole]);
}
