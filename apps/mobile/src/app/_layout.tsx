import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { NetworkProvider, OfflineBanner } from "@/offline/network-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { RoleProvider } from "@/providers/role-provider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>
          <RoleProvider>
            <StatusBar style="auto" />
            <View style={{ flex: 1 }}>
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="(customer)" />
                <Stack.Screen name="(stylist)" />
              </Stack>
            </View>
          </RoleProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
