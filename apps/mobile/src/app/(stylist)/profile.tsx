import { useCallback, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { getStylistProfiles, type StylistProfileItem } from "@/booking/http-adapter";
import { Card, Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { InlineError } from "@/components/booking-wizard";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

export default function StylistProfileScreen() {
  const { token, user } = useAuth();
  const theme = useAppTheme();
  const [profiles, setProfiles] = useState<StylistProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!token) { setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { setProfiles(await getStylistProfiles(token)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải hồ sơ Stylist."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <Screen eyebrow="Tài khoản Stylist" title="Hồ sơ làm việc"
    description="Tên và chi nhánh được cập nhật theo phân công của Manager."
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void load(true); }}
      colors={[theme.brand]} tintColor={theme.brand} />}>
    {loading ? <LoadingState label="Đang tải hồ sơ..." /> : error ?
      <InlineError message={error} onRetry={() => { void load(); }} /> : profiles.length === 0 ?
      <EmptyState icon="person-outline" title="Chưa có phân công"
        description="Manager cần gán tài khoản của bạn vào chi nhánh để hiển thị tên và lịch làm việc." /> : <>
      <Card style={styles.identityCard}>
        <View style={[styles.avatar, { backgroundColor: theme.brand }]}><Ionicons name="person" size={26} color="#FFFFFF" /></View>
        <View style={{ flex: 1 }}><Text style={styles.name}>{profiles[0].displayName}</Text>
          <Text style={styles.role}>Stylist</Text></View>
      </Card>
      <Text style={styles.sectionTitle}>Chi nhánh làm việc</Text>
      {profiles.map((profile) => <Card key={profile.id}>
        <View style={styles.branchRow}><Ionicons name="location-outline" size={20} color={theme.brand} />
          <Text style={styles.branchName}>{profile.branchName || "Chi nhánh chưa cập nhật"}</Text></View>
        {profile.branchAddress ? <Text style={styles.address}>{profile.branchAddress}</Text> : null}
      </Card>)}
    </>}
    {user?.email ? <Card><Text style={styles.accountLabel}>TÀI KHOẢN ĐĂNG NHẬP</Text>
      <Text style={styles.accountEmail}>{user.email}</Text></Card> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  identityCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 22 },
  avatar: { height: 54, width: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  name: { color: "#142443", fontSize: 21, fontWeight: "800" },
  role: { color: "#64748B", fontSize: 13, marginTop: 3 },
  sectionTitle: { marginHorizontal: 20, marginTop: 10, color: "#142443", fontSize: 16, fontWeight: "800" },
  branchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  branchName: { color: "#142443", fontSize: 16, fontWeight: "700", flex: 1 },
  address: { color: "#64748B", fontSize: 13, lineHeight: 20, marginLeft: 28 },
  accountLabel: { color: "#64748B", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  accountEmail: { color: "#142443", fontSize: 15, fontWeight: "600" },
});
