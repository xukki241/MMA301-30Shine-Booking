import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RoleProvider } from "@/providers/role-provider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RoleProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(stylist)" />
        </Stack>
      </RoleProvider>
    </SafeAreaProvider>
  );
}
