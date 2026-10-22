import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createCoreApiAppointmentDataSource } from "@/appointments/core-api-adapter";
import { demoAppointmentDataSource } from "@/appointments/demo-adapter";
import { selectUpcomingAppointment } from "@/appointments/presentation";
import type { CustomerAppointment } from "@/appointments/types";
import { listHomeStylists, listPublicHomeServices, type HomeService, type HomeStylist } from "@/booking/http-adapter";
import { RoleResetButton } from "@/components/role-reset-button";
import { Badge, BrandButton, Card, PrimaryButton } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

function formatDateTime(value: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  } catch {
    return value;
  }
}

export default function CustomerHomeScreen() {
  const theme = useAppTheme();
  const { token, user } = useAuth();
  const [upcoming, setUpcoming] = useState<CustomerAppointment | null>(null);
  const [homeServices, setHomeServices] = useState<HomeService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(false);
  const [homeStylists, setHomeStylists] = useState<HomeStylist[]>([]);
  const [stylistsLoading, setStylistsLoading] = useState(true);
  const [stylistsError, setStylistsError] = useState(false);

  const isDemo = process.env.EXPO_PUBLIC_USE_DEMO_API === "true";

  const dataSource = useMemo(() => {
    if (isDemo) return demoAppointmentDataSource;
    return createCoreApiAppointmentDataSource(
      () => token,
      () => user?.id
    );
  }, [isDemo, token, user?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!token && !isDemo) {
        setUpcoming(null);
        return () => {
          active = false;
        };
      }

      setUpcoming(null);
      const refresh = () => { void dataSource.list()
        .then((items) => {
          if (!active) return;
          setUpcoming(selectUpcomingAppointment(items));
        })
        .catch(() => {
          if (active) setUpcoming(null);
        }); };
      refresh();
      const interval = setInterval(refresh, 30000);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [dataSource, token, isDemo])
  );

  useFocusEffect(useCallback(() => {
    let active = true;
    setServicesLoading(true);
    setServicesError(false);
    setHomeServices([]);
    listPublicHomeServices().then((items) => {
      if (active) { setHomeServices(items); setServicesError(false); }
    }).catch(() => { if (active) setServicesError(true); })
      .finally(() => { if (active) setServicesLoading(false); });
    return () => { active = false; };
  }, []));

  useFocusEffect(useCallback(() => {
    let active = true;
    setHomeStylists([]);
    setStylistsLoading(true);
    setStylistsError(false);
    if (!token) { setStylistsLoading(false); return () => { active = false; }; }
    listHomeStylists(token).then((items) => {
      if (active) setHomeStylists(items);
    }).catch(() => { if (active) setStylistsError(true); })
      .finally(() => { if (active) setStylistsLoading(false); });
    return () => { active = false; };
  }, [token]));

  function showGuaranteeAlert() {
    Alert.alert(
      "Cam kết bảo hành tóc 7 ngày",
      "30Shine cam kết bảo hành form tóc trong 7 ngày miễn phí 100%. Nếu bạn chưa thực sự ưng ý với kiểu tóc vừa cắt, hãy ghé bất kỳ chi nhánh nào để stylist căn chỉnh lại ngay.",
      [{ text: "Đã hiểu", style: "default" }]
    );
  }

  function showPricingAlert() {
    Alert.alert(
      "Bảng giá niêm yết 30Shine",
      "• Shine Combo 10 bước: 100.000đ - 120.000đ\n• Uốn định hình chuẩn Hàn: Từ 386.000đ\n• Nhuộm thời trang: Từ 299.000đ\n• Chăm sóc da & Lấy ráy tai: Từ 59.000đ\n\nCam kết: Không chèo kéo dịch vụ, bảo vệ khách hàng.",
      [{ text: "Đóng", style: "default" }]
    );
  }

  function handleCallHotline() {
    Linking.openURL("tel:1900272703").catch(() => {
      Alert.alert("Hotline 30Shine", "Tổng đài CSKH: 1900.27.27.03 (8h00 - 21h30 hàng ngày)");
    });
  }

  const displayName = user?.name
    ? user.name.toUpperCase()
    : user?.email
    ? user.email.split("@")[0].toUpperCase()
    : "GUEST";

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* 1. Deep Navy Header Section (Stitch Style) */}
      <View style={[styles.navyHeader, { backgroundColor: theme.brand }]}>
        <SafeAreaView edges={["top"]} style={styles.safeAreaHeader}>
          {/* Top Brand & Hotline Bar */}
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Ionicons name="cut" size={16} color={theme.brand} />
              </View>
              <Text style={styles.brandTitleText}>30SHINE ĐẶT LỊCH</Text>
            </View>

            <View style={styles.topRightActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gọi hotline"
                onPress={handleCallHotline}
                style={styles.hotlinePill}
              >
                <Text style={styles.hotlineText}>Hotline</Text>
                <Ionicons name="call" size={14} color="#FFFFFF" />
              </Pressable>
              <RoleResetButton variant="onBrand" />
            </View>
          </View>

          {/* User Profile Overview */}
          <Pressable accessibilityRole="button" accessibilityLabel="Mở trang Tài khoản" onPress={() => router.push("/(customer)/account")} style={styles.userSection}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={26} color="#FFFFFF" />
              {token ? <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View> : null}
            </View>

            <View style={styles.userInfoCol}>
              <View style={styles.userNameRow}>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.guestTag}>
                  <Text style={styles.guestTagText}>
                    {user?.phone ? user.phone : "Khách vãng lai"}
                  </Text>
                </View>
              </View>
              <Text style={styles.userSubtitle}>
                {user?.phone
                  ? "Chọn dịch vụ, stylist và giờ phù hợp"
                  : "Đăng nhập để đặt lịch với stylist"}
              </Text>
              {!token ? <Text style={{ color: "#FFFFFF", fontWeight: "800", marginTop: 6 }}>Xem tài khoản ›</Text> : null}
            </View>

          </Pressable>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. Upcoming Appointment Banner (if any) */}
        {upcoming ? (
          <View style={[styles.upcomingCard, { backgroundColor: theme.surface, borderColor: theme.brand }]}>
            <View style={styles.upcomingHeaderRow}>
              <View style={styles.liveBadgeRow}>
                <View style={[styles.pulseDot, { backgroundColor: theme.success }]} />
                <Text style={[styles.upcomingTag, { color: theme.brand }]}>
                  LỊCH HẸN SẮP TỚI
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: theme.successMuted }]}>
                <Text style={[styles.statusPillText, { color: theme.success }]}>ĐÃ XÁC NHẬN</Text>
              </View>
            </View>

            <Text style={[styles.upcomingTime, { color: theme.text }]}>
              {formatDateTime(upcoming.startTime)}
            </Text>
            <Text style={[styles.upcomingDesc, { color: theme.textMuted }]}>
              Stylist và chi nhánh đã sẵn sàng đón tiếp bạn. Vui lòng đến trước 5 phút để được phục vụ chu đáo nhất.
            </Text>

            <Pressable
              style={[styles.upcomingButton, { backgroundColor: theme.brand }]}
              onPress={() => router.push("/(customer)/appointments")}
            >
              <Text style={styles.upcomingButtonText}>Xem chi tiết & đổi lịch</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        {/* 3. Welcome / Booking Hero Box (Matching Stitch Screen 1) */}
        <View style={[styles.welcomeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>
            Chào Mừng Quý Khách Đến 30Shine
          </Text>
          <Text style={[styles.welcomeDesc, { color: theme.textMuted }]}>
            Chọn salon, dịch vụ và stylist phù hợp, sau đó đặt giờ còn trống ngay trên ứng dụng.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đặt lịch ngay"
            onPress={() => router.push("/(customer)/book")}
            style={[styles.heroBookingBtn, { backgroundColor: theme.brand }]}
          >
            <Ionicons name="calendar-outline" size={18} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.heroBookingBtnText}>
              {token ? "ĐẶT LỊCH CẮT NGAY" : "ĐĂNG NHẬP / ĐẶT LỊCH NGAY"}
            </Text>
          </Pressable>

          <View style={styles.trustBadgesRow}>
            <View style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={14} color={theme.success} />
              <Text style={[styles.trustText, { color: theme.textMuted }]}>Nhanh gọn 30 giây</Text>
            </View>
            <Text style={[styles.trustDot, { color: theme.textDim }]}>•</Text>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={14} color="#3B82F6" />
              <Text style={[styles.trustText, { color: theme.textMuted }]}>Bảo mật thông tin</Text>
            </View>
            <Text style={[styles.trustDot, { color: theme.textDim }]}>•</Text>
            <View style={styles.trustItem}>
              <Ionicons name="sparkles" size={14} color={theme.gold} />
              <Text style={[styles.trustText, { color: theme.textMuted }]}>Bảo hành 7 ngày</Text>
            </View>
          </View>
        </View>

        <View style={styles.stylistSection}>
          <View style={styles.stylistHeadingRow}>
            <View style={styles.crownRow}>
              <Ionicons name="people-outline" size={20} color={theme.brand} />
              <Text style={[styles.sectionTitleText, { color: theme.text }]}>ĐỘI NGŨ STYLIST</Text>
            </View>
            <Pressable onPress={() => router.push("/(customer)/book")}>
              <Text style={[styles.viewAllText, { color: theme.brand }]}>Đặt lịch ›</Text>
            </Pressable>
          </View>
          {stylistsLoading ? <Text style={{ color: theme.textMuted }}>Đang tải stylist...</Text> : null}
          {stylistsError ? <Text style={{ color: theme.textMuted }}>Không tải được stylist. Vui lòng thử lại.</Text> : null}
          {!stylistsLoading && !stylistsError && homeStylists.length === 0
            ? <Text style={{ color: theme.textMuted }}>Chưa có stylist đang hoạt động.</Text> : null}
          {homeStylists.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stylistList}>
            {homeStylists.map(({ branch, stylist }) => <Pressable key={`${branch.id}-${stylist.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Đặt lịch với ${stylist.name} tại ${branch.name}`}
              onPress={() => router.push({ pathname: "/(customer)/book",
                params: { branchId: branch.id, stylistId: stylist.id } })}
              style={[styles.stylistProfileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.stylistAvatar, { backgroundColor: theme.brandMuted }]}>
                <Ionicons name="person" size={30} color={theme.brand} />
              </View>
              <Text style={[styles.serviceNameText, { color: theme.text }]} numberOfLines={1}>{stylist.name}</Text>
              <Text style={[styles.serviceSubtext, { color: theme.textMuted }]} numberOfLines={2}>{branch.name}</Text>
              <Text style={[styles.serviceSelectLink, { color: theme.brand }]}>Chọn stylist ›</Text>
            </Pressable>)}
          </ScrollView> : null}
        </View>

        {/* 5. Signature Hair Services Section (From Screenshot 4 & code) */}
        <View style={styles.sectionHeadingRow}>
          <View style={styles.sectionTitleWithBar}>
            <View style={[styles.verticalBar, { backgroundColor: theme.brand }]} />
            <Text style={[styles.sectionTitleText, { color: theme.text }]}>DỊCH VỤ TÓC</Text>
          </View>
          <Pressable onPress={() => router.push("/(customer)/book")}>
            <Text style={[styles.viewAllText, { color: theme.brand }]}>Đặt lịch ngay ›</Text>
          </Pressable>
        </View>

        {servicesLoading && homeServices.length === 0 ? <Text style={{ color: theme.textMuted }}>
          Đang tải dịch vụ...</Text> : null}
        {servicesError ? <Text style={{ color: theme.textMuted }}>Không tải được dịch vụ. Vui lòng thử lại.</Text> : null}
        {!servicesLoading && !servicesError && homeServices.length === 0 ? <Text style={{ color: theme.textMuted }}>
          Chưa có dịch vụ đang hoạt động.</Text> : null}
        <View style={styles.servicesGrid}>
          {homeServices.map(({ branch, service, description }) => <Pressable key={`${branch.id}-${service.id}`}
            style={[styles.serviceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push({ pathname: "/(customer)/book",
              params: { branchId: branch.id, serviceId: service.id } })}>
            <View style={[styles.serviceIconContainer, { backgroundColor: theme.brandMuted }]}>
              <Ionicons name="cut" size={32} color={theme.brand} />
            </View>
            <Text style={[styles.serviceNameText, { color: theme.text }]}>{service.name}</Text>
            <Text style={[styles.servicePriceText, { color: theme.brand }]}>
              {new Intl.NumberFormat("vi-VN").format(service.priceVnd)} VNĐ</Text>
            <Text style={[styles.serviceSubtext, { color: theme.textMuted }]} numberOfLines={2}>
              {branch.name} · {service.durationMinutes} phút{description ? ` · ${description}` : ""}
            </Text>
            <View style={styles.serviceSelectRow}>
              <Text style={[styles.serviceSelectLink, { color: theme.brand }]}>Chọn dịch vụ ›</Text>
            </View>
          </Pressable>)}
        </View>

        {/* 6. Menu List Items (Matching Stitch Screen 1) */}
        <View style={[styles.menuContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Salon System */}
          <Pressable
            style={[styles.menuRow, { borderBottomColor: theme.border }]}
            onPress={() => router.push("/(customer)/book")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#EBF5FF" }]}>
              <Ionicons name="location-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuMainTitle, { color: theme.text }]}>
                Hệ thống gần 100 Salon 30Shine
              </Text>
              <Text style={[styles.menuSubTitle, { color: theme.textMuted }]}>
                Tìm salon gần nhất, đặt lịch và chỉ dẫn đường đi
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textDim} />
          </Pressable>

          {/* Pricing & Commitments */}
          <Pressable
            style={[styles.menuRow, { borderBottomColor: theme.border }]}
            onPress={showPricingAlert}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#16A34A" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuMainTitle, { color: theme.text }]}>
                Bảng giá niêm yết & Cam kết 30Shine
              </Text>
              <Text style={[styles.menuSubTitle, { color: theme.textMuted }]}>
                Không chèo kéo dịch vụ, bảo vệ khách hàng
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textDim} />
          </Pressable>

          {/* 7-day Warranty */}
          <Pressable
            style={[styles.menuRow, { borderBottomColor: theme.border }]}
            onPress={showGuaranteeAlert}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="refresh-outline" size={20} color="#DC2626" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuMainTitle, { color: theme.text }]}>
                Chính sách bảo hành tóc 7 ngày
              </Text>
              <Text style={[styles.menuSubTitle, { color: theme.textMuted }]}>
                Chỉnh sửa tóc hoặc uốn/nhuộm lại 100% miễn phí
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textDim} />
          </Pressable>

          {/* Review & Feedback */}
          <Pressable
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => router.push("/(customer)/appointments")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#FFFBEB" }]}>
              <Ionicons name="star-outline" size={20} color="#D97706" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuMainTitle, { color: theme.text }]}>
                Đánh giá dịch vụ & Góp ý
              </Text>
              <Text style={[styles.menuSubTitle, { color: theme.textMuted }]}>
                Giúp 30Shine nâng cao trải nghiệm của bạn
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textDim} />
          </Pressable>
        </View>

        {/* 7. Hotline & Support Bar (Matching Stitch Screen 1 Bottom) */}
        <View style={[styles.hotlineBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.hotlineLeft}>
            <View style={[styles.headphoneCircle, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="headset" size={22} color={theme.brand} />
            </View>
            <View style={styles.hotlineTextCol}>
              <Text style={[styles.hotlineLabel, { color: theme.textMuted }]}>Tổng đài CSKH miễn cước</Text>
              <Text style={[styles.hotlineNumber, { color: theme.text }]}>1900.27.27.03</Text>
              <Text style={[styles.hotlineHours, { color: theme.textDim }]}>Hỗ trợ từ 8h00 - 21h30 hàng ngày</Text>
            </View>
          </View>
          <Pressable
            style={[styles.callNowBtn, { backgroundColor: theme.brand }]}
            onPress={handleCallHotline}
          >
            <Text style={styles.callNowBtnText}>Gọi ngay</Text>
          </Pressable>
        </View>

        {/* Copyright info */}
        <Text style={[styles.footerText, { color: theme.textDim }]}>
          Phiên bản 30Shine 4.2.0 • 2025 30Shine Joint Stock Company
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  navyHeader: {
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28
  },
  safeAreaHeader: {
    paddingHorizontal: 16
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 10 : 4,
    marginBottom: 16
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  brandTitleText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  hotlinePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5
  },
  hotlineText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    position: "relative"
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    backgroundColor: "#F59E0B",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#1B2A4A"
  },
  userInfoCol: {
    flex: 1
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  userNameText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900"
  },
  guestTag: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  guestTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700"
  },
  userSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 2
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16
  },
  upcomingCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  upcomingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  liveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  upcomingTag: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800"
  },
  upcomingTime: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2
  },
  upcomingDesc: {
    fontSize: 12,
    lineHeight: 18
  },
  upcomingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 4
  },
  upcomingButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  welcomeBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6
  },
  welcomeTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center"
  },
  welcomeDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  heroBookingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    height: 48,
    gap: 8,
    marginTop: 2
  },
  btnIcon: {
    marginRight: 2
  },
  heroBookingBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  trustBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  trustText: {
    fontSize: 11,
    fontWeight: "600"
  },
  trustDot: {
    fontSize: 10
  },
  stylistSection: { gap: 14 },
  stylistList: { gap: 12, paddingRight: 20 },
  stylistProfileCard: { width: 150, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  stylistAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  stylistHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  crownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4
  },
  sectionTitleWithBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  verticalBar: {
    width: 4,
    height: 18,
    borderRadius: 2
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700"
  },
  servicesGrid: {
    flexDirection: "row",
    gap: 12
  },
  serviceCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    position: "relative"
  },
  serviceBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1
  },
  serviceBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900"
  },
  serviceIconContainer: {
    width: "100%",
    height: 80,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  serviceNameText: {
    fontSize: 13,
    fontWeight: "800"
  },
  servicePriceText: {
    fontSize: 13,
    fontWeight: "900"
  },
  serviceSubtext: {
    fontSize: 11,
    lineHeight: 15
  },
  serviceSelectRow: {
    marginTop: 4
  },
  serviceSelectLink: {
    fontSize: 12,
    fontWeight: "700"
  },
  menuContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden"
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12
  },
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  menuTextCol: {
    flex: 1,
    gap: 2
  },
  menuMainTitle: {
    fontSize: 14,
    fontWeight: "700"
  },
  menuSubTitle: {
    fontSize: 11,
    lineHeight: 16
  },
  hotlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14
  },
  hotlineLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  headphoneCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  hotlineTextCol: {
    flex: 1,
    gap: 1
  },
  hotlineLabel: {
    fontSize: 11,
    fontWeight: "600"
  },
  hotlineNumber: {
    fontSize: 16,
    fontWeight: "900"
  },
  hotlineHours: {
    fontSize: 10
  },
  callNowBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  callNowBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  footerText: {
    fontSize: 11,
    textAlign: "center",
    marginVertical: 12
  }
});
