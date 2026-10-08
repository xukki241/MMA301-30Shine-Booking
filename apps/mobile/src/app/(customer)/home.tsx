import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { createCoreApiAppointmentDataSource } from "@/appointments/core-api-adapter";
import { demoAppointmentDataSource } from "@/appointments/demo-adapter";
import type { CustomerAppointment } from "@/appointments/types";
import {
  Badge,
  Card,
  PrimaryButton,
  Screen,
  SecondaryButton
} from "@/components/screen";
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

      void dataSource
        .list()
        .then((items) => {
          if (!active) return;
          const next = items.find((item) => item.status === "booked");
          setUpcoming(next || null);
        })
        .catch(() => {
          // Graceful fallback when network or mock fails
          if (active) setUpcoming(null);
        });

      return () => {
        active = false;
      };
    }, [dataSource, token, isDemo])
  );

  function showGuaranteeAlert() {
    Alert.alert(
      "Cam kết bảo hành 7 ngày",
      "30Shine cam kết bảo hành form tóc trong 7 ngày miễn phí 100%. Nếu bạn chưa thực sự ưng ý với kiểu tóc vừa cắt, hãy ghé bất kỳ chi nhánh nào để stylist căn chỉnh lại ngay.",
      [{ text: "Đã hiểu", style: "default" }]
    );
  }

  const displayName = user?.email
    ? user.email.split("@")[0].toUpperCase()
    : "QUÝ KHÁCH";

  return (
    <Screen contentContainerStyle={styles.screenContainer}>
      {/* 1. Header Greeting & User Tier */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingTextContainer}>
          <Text style={[styles.greetingSubtitle, { color: theme.textMuted }]}>
            Xin chào,
          </Text>
          <Text style={[styles.greetingTitle, { color: theme.text }]}>
            {displayName}
          </Text>
        </View>
        <View
          style={[
            styles.membershipPill,
            {
              backgroundColor: theme.goldMuted,
              borderColor: theme.gold
            }
          ]}
        >
          <Ionicons
            name="star"
            size={12}
            color={theme.gold}
            style={styles.starIcon}
          />
          <Text style={[styles.membershipText, { color: theme.gold }]}>
            Shine Member
          </Text>
        </View>
      </View>

      {/* 2. Upcoming Appointment Banner (Context-aware) */}
      {upcoming ? (
        <Card highlighted style={styles.upcomingCard}>
          <View style={styles.upcomingHeaderRow}>
            <View style={styles.liveIndicatorRow}>
              <View
                style={[
                  styles.statusPulseDot,
                  { backgroundColor: theme.brand }
                ]}
              />
              <Text
                style={[styles.upcomingLabelText, { color: theme.brand }]}
              >
                LỊCH HẸN SẮP TỚI
              </Text>
            </View>
            <Badge label="ĐÃ XÁC NHẬN" variant="success" />
          </View>
          <Text style={[styles.upcomingTime, { color: theme.text }]}>
            {formatDateTime(upcoming.startTime)}
          </Text>
          <Text style={[styles.upcomingSubtext, { color: theme.textMuted }]}>
            Stylist và chi nhánh đã sẵn sàng đón tiếp bạn. Vui lòng đến trước 5
            phút để được phục vụ chu đáo nhất.
          </Text>
          <SecondaryButton
            label="Xem chi tiết & đổi lịch"
            onPress={() => router.push("/(customer)/appointments")}
            icon={
              <Ionicons
                name="calendar-outline"
                size={16}
                color={theme.text}
              />
            }
          />
        </Card>
      ) : null}

      {/* 3. Hero Booking Card (Primary CTA Engine) */}
      <Card style={styles.heroCard}>
        <View style={styles.heroBadgeRow}>
          <Badge label="ĐẶT LỊCH NHANH 30S" variant="brand" />
          <Ionicons name="sparkles" size={16} color={theme.brand} />
        </View>

        <Text style={[styles.heroHeadline, { color: theme.text }]}>
          Tút lại vẻ đẹp trai cùng 30Shine
        </Text>
        <Text style={[styles.heroDescription, { color: theme.textMuted }]}>
          Chủ động giữ chỗ chỉ với 4 bước đơn giản. Đến đúng giờ, cắt đúng hẹn,
          không lo chờ đợi.
        </Text>

        {/* 4-Step Process Bar */}
        <View
          style={[
            styles.stepsContainer,
            {
              backgroundColor: theme.surfaceHighlight,
              borderColor: theme.borderLight
            }
          ]}
        >
          <View style={styles.stepItem}>
            <View
              style={[styles.stepCircle, { backgroundColor: theme.brand }]}
            >
              <Text style={styles.stepCircleNumber}>1</Text>
            </View>
            <Text style={[styles.stepLabel, { color: theme.text }]}>
              Chi nhánh
            </Text>
          </View>
          <Text style={[styles.stepArrow, { color: theme.textMuted }]}>→</Text>

          <View style={styles.stepItem}>
            <View
              style={[styles.stepCircle, { backgroundColor: theme.brand }]}
            >
              <Text style={styles.stepCircleNumber}>2</Text>
            </View>
            <Text style={[styles.stepLabel, { color: theme.text }]}>
              Dịch vụ
            </Text>
          </View>
          <Text style={[styles.stepArrow, { color: theme.textMuted }]}>→</Text>

          <View style={styles.stepItem}>
            <View
              style={[styles.stepCircle, { backgroundColor: theme.brand }]}
            >
              <Text style={styles.stepCircleNumber}>3</Text>
            </View>
            <Text style={[styles.stepLabel, { color: theme.text }]}>
              Stylist
            </Text>
          </View>
          <Text style={[styles.stepArrow, { color: theme.textMuted }]}>→</Text>

          <View style={styles.stepItem}>
            <View
              style={[styles.stepCircle, { backgroundColor: theme.brand }]}
            >
              <Text style={styles.stepCircleNumber}>4</Text>
            </View>
            <Text style={[styles.stepLabel, { color: theme.text }]}>
              Giờ cắt
            </Text>
          </View>
        </View>

        {/* Hero Primary Action Button */}
        <PrimaryButton
          label="Đặt lịch cắt tóc ngay"
          accessibilityHint="Mở luồng đặt lịch 4 bước tại chi nhánh mong muốn"
          onPress={() => router.push("/(customer)/book")}
          icon={<Ionicons name="calendar" size={17} color="#FFFFFF" />}
        />

        {/* Hero reassurance checklist */}
        <View style={styles.heroCheckRow}>
          <View style={styles.checkItem}>
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={theme.success}
              style={styles.checkIcon}
            />
            <Text style={[styles.checkText, { color: theme.textDim }]}>
              Giữ chỗ 30s
            </Text>
          </View>
          <Text style={[styles.checkDot, { color: theme.textDim }]}>•</Text>
          <View style={styles.checkItem}>
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={theme.success}
              style={styles.checkIcon}
            />
            <Text style={[styles.checkText, { color: theme.textDim }]}>
              Miễn phí hủy lịch
            </Text>
          </View>
          <Text style={[styles.checkDot, { color: theme.textDim }]}>•</Text>
          <View style={styles.checkItem}>
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={theme.success}
              style={styles.checkIcon}
            />
            <Text style={[styles.checkText, { color: theme.textDim }]}>
              Bảo hành 7 ngày
            </Text>
          </View>
        </View>
      </Card>

      {/* 4. Quick Action Shortcuts Grid */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Thao tác nhanh
        </Text>
      </View>

      <View style={styles.quickActionsGrid}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đặt lịch cắt"
          onPress={() => router.push("/(customer)/book")}
          style={({ pressed }) => [
            styles.quickActionTile,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.75 : 1
            }
          ]}
        >
          <View
            style={[
              styles.quickActionIconWrap,
              { backgroundColor: theme.brandMuted }
            ]}
          >
            <Ionicons name="cut" size={20} color={theme.brand} />
          </View>
          <Text style={[styles.quickActionTitle, { color: theme.text }]}>
            Đặt lịch cắt
          </Text>
          <Text
            style={[styles.quickActionSubtitle, { color: theme.textMuted }]}
          >
            Chọn chi nhánh & giờ
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lịch hẹn của tôi"
          onPress={() => router.push("/(customer)/appointments")}
          style={({ pressed }) => [
            styles.quickActionTile,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.75 : 1
            }
          ]}
        >
          <View
            style={[
              styles.quickActionIconWrap,
              { backgroundColor: theme.surfaceHighlight }
            ]}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.text} />
          </View>
          <Text style={[styles.quickActionTitle, { color: theme.text }]}>
            Lịch hẹn của tôi
          </Text>
          <Text
            style={[styles.quickActionSubtitle, { color: theme.textMuted }]}
          >
            Quản lý & thanh toán
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Shine Combo 10 bước"
          onPress={() => router.push("/(customer)/book")}
          style={({ pressed }) => [
            styles.quickActionTile,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.75 : 1
            }
          ]}
        >
          <View
            style={[
              styles.quickActionIconWrap,
              { backgroundColor: theme.goldMuted }
            ]}
          >
            <Ionicons name="sparkles" size={20} color={theme.gold} />
          </View>
          <Text style={[styles.quickActionTitle, { color: theme.text }]}>
            Shine Combo
          </Text>
          <Text
            style={[styles.quickActionSubtitle, { color: theme.textMuted }]}
          >
            10 bước cắt gội chuẩn
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chính sách bảo hành 7 ngày"
          onPress={showGuaranteeAlert}
          style={({ pressed }) => [
            styles.quickActionTile,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.75 : 1
            }
          ]}
        >
          <View
            style={[
              styles.quickActionIconWrap,
              { backgroundColor: theme.successMuted }
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={theme.success}
            />
          </View>
          <Text style={[styles.quickActionTitle, { color: theme.text }]}>
            Bảo hành 7 ngày
          </Text>
          <Text
            style={[styles.quickActionSubtitle, { color: theme.textMuted }]}
          >
            Chỉnh sửa 100% free
          </Text>
        </Pressable>
      </View>

      {/* 5. Signature Services Showcase */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Dịch vụ nổi bật
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Trải nghiệm dịch vụ chăm sóc tóc nam hàng đầu Việt Nam
          </Text>
        </View>
      </View>

      <View style={styles.servicesList}>
        <Card style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceTitleCol}>
              <View style={styles.serviceBadgeRow}>
                <Badge label="SIGNATURE" variant="brand" />
                <Text style={[styles.servicePrice, { color: theme.brand }]}>
                  120.000đ
                </Text>
              </View>
              <Text style={[styles.serviceName, { color: theme.text }]}>
                Shine Combo 10 bước
              </Text>
            </View>
          </View>
          <Text
            style={[styles.serviceDescription, { color: theme.textMuted }]}
          >
            Cắt tạo kiểu chuyên sâu, gội đầu thư giãn, massage bấm huyệt cổ vai
            gáy, rửa mặt sáng da và vuốt sáp tạo kiểu chuẩn men.
          </Text>
          <SecondaryButton
            label="Chọn combo này"
            onPress={() => router.push("/(customer)/book")}
            icon={<Ionicons name="cut-outline" size={15} color={theme.text} />}
          />
        </Card>

        <Card style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceTitleCol}>
              <View style={styles.serviceBadgeRow}>
                <Badge label="XU HƯỚNG" variant="gold" />
                <Text style={[styles.servicePrice, { color: theme.gold }]}>
                  Từ 260.000đ
                </Text>
              </View>
              <Text style={[styles.serviceName, { color: theme.text }]}>
                Uốn định hình chuẩn Hàn
              </Text>
            </View>
          </View>
          <Text
            style={[styles.serviceDescription, { color: theme.textMuted }]}
          >
            Uốn phồng chân tóc, Side part, Layer tạo độ bồng bềnh tự nhiên. Giữ
            nếp lâu, dễ sấy tạo kiểu tại nhà mỗi sáng.
          </Text>
          <SecondaryButton
            label="Chọn dịch vụ uốn"
            onPress={() => router.push("/(customer)/book")}
            icon={<Ionicons name="sparkles-outline" size={15} color={theme.text} />}
          />
        </Card>
      </View>

      {/* 6. 30Shine Quality & Payment Commitments */}
      <Card style={styles.guaranteeCard}>
        <View style={styles.guaranteeTitleRow}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={theme.success}
            style={styles.guaranteeIcon}
          />
          <Text style={[styles.guaranteeCardTitle, { color: theme.text }]}>
            Cam kết dịch vụ & thanh toán
          </Text>
        </View>

        <View style={styles.guaranteeItems}>
          <View style={styles.guaranteeItem}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={theme.brand}
              style={styles.guaranteeItemIcon}
            />
            <View style={styles.guaranteeTextCol}>
              <Text style={[styles.guaranteeHeading, { color: theme.text }]}>
                Bảo hành 7 ngày miễn phí
              </Text>
              <Text
                style={[
                  styles.guaranteeDetail,
                  { color: theme.textMuted }
                ]}
              >
                Chỉnh sửa tóc hoặc gội lại hoàn toàn miễn phí nếu bạn chưa vừa ý.
              </Text>
            </View>
          </View>

          <View style={styles.guaranteeItem}>
            <Ionicons
              name="time-outline"
              size={18}
              color={theme.gold}
              style={styles.guaranteeItemIcon}
            />
            <View style={styles.guaranteeTextCol}>
              <Text style={[styles.guaranteeHeading, { color: theme.text }]}>
                Cắt đúng giờ - Không chờ đợi
              </Text>
              <Text
                style={[
                  styles.guaranteeDetail,
                  { color: theme.textMuted }
                ]}
              >
                Chỗ ngồi luôn được giữ riêng cho bạn đúng khung giờ đã đặt.
              </Text>
            </View>
          </View>

          <View style={styles.guaranteeItem}>
            <Ionicons
              name="card-outline"
              size={18}
              color={theme.success}
              style={styles.guaranteeItemIcon}
            />
            <View style={styles.guaranteeTextCol}>
              <Text style={[styles.guaranteeHeading, { color: theme.text }]}>
                Thanh toán sau khi hài lòng
              </Text>
              <Text
                style={[
                  styles.guaranteeDetail,
                  { color: theme.textMuted }
                ]}
              >
                Chỉ thanh toán khi Stylist hoàn tất dịch vụ. Hỗ trợ tiền mặt,
                chuyển khoản và ví điện tử.
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40
  },
  greetingSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  greetingTextContainer: {
    flex: 1
  },
  greetingSubtitle: {
    fontSize: 13,
    fontWeight: "500"
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: 2
  },
  membershipPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  starIcon: {
    marginRight: 4
  },
  membershipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  upcomingCard: {
    marginBottom: 16,
    gap: 10
  },
  upcomingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  statusPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  upcomingLabelText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  upcomingTime: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2
  },
  upcomingSubtext: {
    fontSize: 13,
    lineHeight: 19
  },
  heroCard: {
    marginBottom: 20,
    gap: 12,
    padding: 20
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  heroHeadline: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 2
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 4
  },
  stepItem: {
    alignItems: "center"
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  stepCircleNumber: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800"
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600"
  },
  stepArrow: {
    fontSize: 12,
    fontWeight: "600"
  },
  heroCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 8
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  checkIcon: {
    marginRight: 4
  },
  checkDot: {
    fontSize: 10,
    marginHorizontal: 2
  },
  checkText: {
    fontSize: 12,
    fontWeight: "500"
  },
  sectionHeaderRow: {
    marginBottom: 12,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12
  },
  quickActionTile: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6
  },
  quickActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "700"
  },
  quickActionSubtitle: {
    fontSize: 11,
    lineHeight: 15
  },
  servicesList: {
    gap: 14,
    marginBottom: 20
  },
  serviceCard: {
    gap: 10,
    padding: 16
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  serviceTitleCol: {
    flex: 1
  },
  serviceBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "800"
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "800"
  },
  serviceDescription: {
    fontSize: 13,
    lineHeight: 19
  },
  guaranteeCard: {
    padding: 18,
    gap: 14,
    marginBottom: 10
  },
  guaranteeTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  guaranteeIcon: {
    marginRight: 8
  },
  guaranteeCardTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  guaranteeItems: {
    gap: 12
  },
  guaranteeItem: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  guaranteeItemIcon: {
    marginRight: 10,
    marginTop: 2
  },
  guaranteeTextCol: {
    flex: 1
  },
  guaranteeHeading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2
  },
  guaranteeDetail: {
    fontSize: 12,
    lineHeight: 17
  }
});
