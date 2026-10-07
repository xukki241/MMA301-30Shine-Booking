import NetInfo from "@react-native-community/netinfo";
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/constants/theme";
import { type Connectivity, connectivityFromSnapshot } from "./connectivity";

const NetworkContext = createContext<Connectivity>("unknown");

export function NetworkProvider({ children }: PropsWithChildren) {
  const [connectivity, setConnectivity] = useState<Connectivity>("unknown");

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const unsubscribe = NetInfo.addEventListener((snapshot) => {
      receivedEvent = true;
      if (active) setConnectivity(connectivityFromSnapshot(snapshot));
    });
    void NetInfo.fetch().then((snapshot) => {
      if (active && !receivedEvent) setConnectivity(connectivityFromSnapshot(snapshot));
    }).catch(() => {
      // Keep the unknown state; reads can still use a valid local snapshot.
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  return <NetworkContext.Provider value={connectivity}>{children}</NetworkContext.Provider>;
}

export function useConnectivity(): Connectivity {
  return useContext(NetworkContext);
}

export function OfflineBanner() {
  const connectivity = useConnectivity();
  const theme = useAppTheme();
  if (connectivity !== "offline") return null;

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.surfaceMuted }}>
      <View accessibilityLiveRegion="polite" style={[styles.banner, { borderBottomColor: theme.border }]}>
        <Text style={[styles.message, { color: theme.text }]}>
          Bạn đang ngoại tuyến. Chỉ dữ liệu đã lưu có thể hiển thị.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  message: { fontSize: 14, fontWeight: "700", textAlign: "center" }
});
