import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createCoreApiAppointmentDataSource } from "@/appointments/core-api-adapter";
import { demoAppointmentDataSource } from "@/appointments/demo-adapter";
import { orderCustomerAppointments } from "@/appointments/order";
import { customerAppointmentStatusLabel, isOverdueUnconfirmedAppointment } from "@/appointments/presentation";
import type { CustomerAppointment, CustomerAppointmentDataSource } from "@/appointments/types";
import type { PaymentInput } from "@/appointments/types";
import { InlineError, WizardAction } from "@/components/booking-wizard";
import { PrimaryButton } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { useAppTheme } from "@/constants/theme";
import { type AppointmentSummary, isAppointmentSummary } from "@/offline/appointments";
import { useConnectivity } from "@/offline/network-provider";
import { type ReadResult, readCachedList } from "@/offline/read-cache";
import { useAuth } from "@/providers/auth-provider";

const cacheKeyPrefix = "shine:customer-appointments:v4";

function formattedTime(value: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  } catch {
    return value;
  }
}

export default function CustomerAppointmentsScreen() {
  const theme = useAppTheme();
  const connectivity = useConnectivity();
  const { token, user, requestCustomerRecovery, verifyCustomerRecovery } = useAuth();

  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const orderedAppointments = useMemo(() => orderCustomerAppointments(appointments), [appointments]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentInput["provider"]>("momo");
  const [outcome, setOutcome] = useState<PaymentInput["outcome"]>("success");
  const [paymentMessage, setPaymentMessage] = useState("");
  const pendingPayment = useRef<(PaymentInput & { appointmentId: string }) | null>(null);
  const [revision, setRevision] = useState(0);

  const [searchPhone, setSearchPhone] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryRequested, setRecoveryRequested] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const isDemo = process.env.EXPO_PUBLIC_USE_DEMO_API === "true";
  useEffect(() => {
    if (!token || isDemo || connectivity === "offline") return;
    const interval = setInterval(() => setRevision((value) => value + 1), 30000);
    return () => clearInterval(interval);
  }, [token, isDemo, connectivity]);
  const cacheKey = `${cacheKeyPrefix}:${user?.id || "demo"}:${
    user?.phoneVerified ? "verified" : "device"
  }`;

  const dataSource: CustomerAppointmentDataSource = useMemo(() => {
    if (isDemo) return demoAppointmentDataSource;
    return createCoreApiAppointmentDataSource(() => token);
  }, [isDemo, token]);

  const fetchItems = useCallback(async (): Promise<AppointmentSummary[]> => {
    if (!token && !isDemo) return [];
    const items = await dataSource.list();
    return items.map((item) => ({
      id: item.id,
      startTime: item.startTime,
      status: item.status,
      bookedPrice: item.bookedPrice,
      branchId: item.branchId,
      branchName: item.branchName,
      branchAddress: item.branchAddress,
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      stylistId: item.stylistId,
      stylistName: item.stylistName
    }));
  }, [dataSource, token, isDemo]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setActionError(null);
      setConfirmingCancelId(null);

      if (!token && !isDemo) {
        setAppointments([]);
        setLoading(false);
        return () => {
          active = false;
        };
      }

      setLoading(true);
      setLoadError(null);

      void readCachedList(
        connectivity,
        cacheKey,
        AsyncStorage,
        isAppointmentSummary,
        fetchItems
      )
        .then((next: ReadResult<AppointmentSummary>) => {
          if (!active) return;
          if (next.kind === "fresh" || next.kind === "cached") {
            setAppointments(next.items as CustomerAppointment[]);
          } else if (next.kind === "offline-empty") {
            setAppointments([]);
          } else if (next.kind === "error") {
            setLoadError("Không thể tải lịch hẹn. Vui lòng thử lại.");
          }
        })
        .catch(() => {
          if (active) setLoadError("Không thể tải lịch hẹn.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [connectivity, revision, token, isDemo, fetchItems, cacheKey])
  );

  async function requestRecovery() {
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      await requestCustomerRecovery();
      setRecoveryRequested(true);
    } catch (cause) {
      setRecoveryError(
        cause instanceof Error ? cause.message : "Không thể tạo mã khôi phục."
      );
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function verifyRecovery() {
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      await verifyCustomerRecovery(recoveryCode.trim());
      setRecoveryRequested(false);
      setRecoveryCode("");
      setRevision((prev) => prev + 1);
    } catch (cause) {
      setRecoveryError(
        cause instanceof Error ? cause.message : "Mã khôi phục không đúng."
      );
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function handleCancel(id: string) {
    setProcessingId(id);
    setActionError(null);
    try {
      const updated = await dataSource.cancel(id);
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: updated.status } : item))
      );
      setConfirmingCancelId(null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể hủy lịch hẹn.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handlePay(id: string) {
    if (!dataSource.pay) return;
    if (connectivity === "offline") {
      setActionError("Bạn đang ngoại tuyến. Kết nối mạng rồi thử lại.");
      return;
    }
    setProcessingId(id);
    setActionError(null);
    setPaymentMessage("");
    const prior = pendingPayment.current;
    const input: PaymentInput =
      prior &&
      prior.appointmentId === id &&
      prior.provider === provider &&
      prior.outcome === outcome
        ? prior
        : {
            provider,
            outcome,
            requestId: `pay-${Date.now().toString(36)}-${Math.random()
              .toString(36)
              .slice(2, 12)}`
          };
    pendingPayment.current = { appointmentId: id, ...input };
    try {
      const result = await dataSource.pay(id, input);
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: result.appointment.status } : item
        )
      );
      setPaymentMessage(
        result.attempt.status === "failed"
          ? "Lần thử thanh toán mô phỏng thất bại. Bạn có thể thử lại."
          : "Thanh toán mô phỏng thành công."
      );
      pendingPayment.current = null;
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể thanh toán.");
    } finally {
      setProcessingId(null);
    }
  }

  const displayName = user?.name
    ? user.name
    : user?.email
    ? user.email.split("@")[0].toUpperCase()
    : "GUEST";

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* 1. Deep Navy Header Section (Matching Stitch Screen 3) */}
      <View style={[styles.navyHeader, { backgroundColor: theme.brand }]}>
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <View style={styles.headerBar}>
            <View style={styles.userHeaderInfo}>
              <View style={styles.smallAvatar}>
                <Ionicons name="person" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerUserName}>{displayName}</Text>
                <Pressable onPress={() => router.push("/login")}>
                  <Text style={styles.headerLoginLink}>
                    {user?.phone ? user.phone : "Đăng nhập ngay ›"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              <Pressable
                onPress={() => Linking.openURL("tel:1900272703").catch(() => {})}
                style={styles.hotlinePill}
              >
                <Text style={styles.hotlineText}>Hotline</Text>
                <Ionicons name="call" size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. Unregistered Alert Box (From Stitch Screenshot 3) */}
        {!token && !isDemo ? (
          <View style={[styles.notLoggedInCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <View style={styles.notLoggedIconCircle}>
              <Ionicons name="sync" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.notLoggedTitle}>Anh chưa đăng nhập!</Text>
              <Text style={styles.notLoggedSub}>
                Đăng nhập bằng số điện thoại để đồng bộ ảnh các kiểu tóc đã cắt, theo dõi lịch sử dịch vụ và áp dụng bảo hành 7 ngày.
              </Text>
              <Pressable
                style={[styles.loginNowBtn, { backgroundColor: theme.brand }]}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.loginNowBtnText}>Đăng nhập ngay →</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Recovery Section (For Unverified Phone) */}
        {user?.phone && !user.phoneVerified && !isDemo ? (
          <View style={[styles.recoveryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.recoveryTitleRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={theme.brand} />
              <Text style={[styles.recoveryTitle, { color: theme.text }]}>
                Khôi phục lịch trên thiết bị cũ
              </Text>
            </View>
            <Text style={[styles.recoveryDesc, { color: theme.textMuted }]}>
              Mã OTP khôi phục được ghi ở log Auth Service, không mất phí và không gửi SMS.
            </Text>
            {recoveryRequested ? (
              <View style={{ gap: 8 }}>
                <TextInput
                  accessibilityLabel="Mã OTP khôi phục"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="Nhập mã OTP 6 số..."
                  placeholderTextColor={theme.textDim}
                  value={recoveryCode}
                  onChangeText={setRecoveryCode}
                  style={[styles.otpInput, { color: theme.text, borderColor: theme.border }]}
                />
                <WizardAction
                  label="Xác nhận mã OTP"
                  onPress={() => {
                    void verifyRecovery();
                  }}
                  loading={recoveryBusy}
                />
              </View>
            ) : (
              <WizardAction
                label="Lấy mã khôi phục"
                onPress={() => {
                  void requestRecovery();
                }}
                loading={recoveryBusy}
              />
            )}
            {recoveryError ? <InlineError message={recoveryError} /> : null}
          </View>
        ) : null}

        {/* 3. Search Bar for Appointments (Matching Stitch Screenshot 3) */}
        <View style={[styles.lookupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.lookupTitle, { color: theme.text }]}>
            TRA CỨU LỊCH HẸN & LỊCH SỬ
          </Text>
          <Text style={[styles.lookupSub, { color: theme.textMuted }]}>
            Kiểm tra thông tin ca cắt hoặc gói dịch vụ gần nhất của Anh:
          </Text>

          <View style={styles.lookupInputRow}>
            <View style={[styles.phoneInputWrap, { borderColor: theme.border, backgroundColor: theme.surfaceHighlight }]}>
              <Ionicons name="call-outline" size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.phoneInput, { color: theme.text }]}
                placeholder={user?.phone || "Nhập số điện thoại đặt lịch..."}
                placeholderTextColor={theme.textDim}
                keyboardType="phone-pad"
                value={searchPhone}
                onChangeText={setSearchPhone}
              />
            </View>
            <Pressable
              style={[styles.lookupBtn, { backgroundColor: theme.brand }]}
              onPress={() => setRevision((v) => v + 1)}
            >
              <Text style={styles.lookupBtnText}>Tra cứu</Text>
            </Pressable>
          </View>
        </View>

        {/* 4. Appointments List Section */}
        <View style={styles.sectionHeadingRow}>
          <Text style={[styles.sectionHeadingText, { color: theme.text }]}>
            LỊCH GẦN NHẤT
          </Text>
          <Text style={[styles.appointmentCountText, { color: theme.textMuted }]}>
            {appointments.length} lịch hẹn
          </Text>
        </View>

        {loading ? (
          <LoadingState label="Đang tải lịch sử đặt hẹn..." />
        ) : loadError ? (
          <View style={[styles.errorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cloud-offline-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.errorCardTitle, { color: theme.text }]}>Không thể tải lịch hẹn</Text>
            <Text style={[styles.errorCardSub, { color: theme.textMuted }]}>{loadError}</Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: theme.brand }]}
              onPress={() => setRevision((v) => v + 1)}
            >
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : appointments.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Chưa có lịch hẹn nào"
            description="Bạn chưa có lịch hẹn cắt tóc. Hãy đặt ngay để trải nghiệm dịch vụ chuẩn 5 sao."
            action={
              <PrimaryButton
                label="Đặt lịch ngay"
                onPress={() => router.push("/(customer)/book")}
                style={{ minWidth: 160 }}
              />
            }
          />
        ) : (
          orderedAppointments.map((item) => {
            const isCompleted = item.status === "completed";
            const isPaid = item.status === "paid";
            const isBooked = item.status === "booked";
            const isCancelled = item.status === "cancelled";
            const isNoShow = item.status === "no_show";
            const isOverdueBooked = isOverdueUnconfirmedAppointment(item);

            const statusBg = isCompleted
              ? "#DCFCE7"
              : isPaid
              ? "#DBEAFE"
              : isCancelled || isNoShow
              ? "#FEE2E2"
              : theme.brandMuted;

            const statusTextColor = isCompleted
              ? "#166534"
              : isPaid
              ? "#1E40AF"
              : isCancelled || isNoShow
              ? "#991B1B"
              : theme.brand;

            return (
              <View
                key={item.id}
                style={[styles.appointmentCard, { backgroundColor: isBooked ? theme.surfaceHighlight : theme.surface,
                  borderColor: isBooked ? theme.brand : theme.border }, isBooked && styles.bookedCard]}
              >
                {isBooked ? <View style={styles.bookedBanner}>
                  <Ionicons name={isOverdueBooked ? "time-outline" : "calendar"} size={16} color={theme.brand} />
                  <Text style={[styles.bookedBannerText, { color: theme.brand }]}>
                    {isOverdueBooked ? "CHƯA GHI NHẬN KHÁCH ĐẾN" : "LỊCH ĐÃ ĐẶT"}
                  </Text>
                </View> : null}
                {isNoShow ? <View style={styles.bookedBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
                  <Text style={[styles.bookedBannerText, { color: theme.danger }]}>BẠN ĐÃ KHÔNG ĐẾN</Text>
                </View> : null}
                {/* Top Header of Card */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.cardDateSub, { color: theme.textDim }]}>
                      NGÀY THỰC HIỆN
                    </Text>
                    <Text style={[styles.cardDateTime, { color: theme.text }]}>
                      {formattedTime(item.startTime)}
                    </Text>
                  </View>

                  <View style={styles.cardPriceStatusCol}>
                    {item.bookedPrice !== undefined ? (
                      <Text style={[styles.cardPrice, { color: theme.brand }]}>
                        {new Intl.NumberFormat("vi-VN").format(item.bookedPrice)} ₫
                      </Text>
                    ) : null}
                    <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusTagText, { color: statusTextColor }]}>
                        {customerAppointmentStatusLabel(item.status, item.startTime)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                {/* Details Information */}
                <View style={styles.cardDetailsList}>
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={16} color={theme.brand} />
                    <Text style={[styles.detailText, { color: theme.text }]}>
                      {item.branchName || "Chưa có tên chi nhánh"}
                    </Text>
                  </View>

                  {item.branchAddress ? <Text style={[styles.detailText, { color: theme.textMuted }]}>
                    {item.branchAddress}</Text> : null}

                  <View style={styles.detailItem}>
                    <Ionicons name="person-outline" size={16} color={theme.gold} />
                    <Text style={[styles.detailText, { color: theme.text }]}>
                      Stylist: <Text style={{ fontWeight: "700" }}>{item.stylistName || "Chưa có thông tin"}</Text>
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="cut-outline" size={16} color="#3B82F6" />
                    <Text style={[styles.detailText, { color: theme.text }]}>
                      Gói: {item.serviceName || "Chưa có thông tin dịch vụ"}
                    </Text>
                  </View>
                </View>

                {/* Flow 1: Cancel for booked appointments */}
                {isBooked && Date.now() < new Date(item.startTime).getTime() && confirmingCancelId !== item.id ? (
                  <View style={styles.actionBtnRow}>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.outlineBtn, { borderColor: theme.danger, backgroundColor: theme.danger }]}
                      disabled={processingId !== null}
                      onPress={() => {
                        setActionError(null);
                        setConfirmingCancelId(item.id);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={[styles.outlineBtnText, { color: "#FFFFFF" }]}>Hủy lịch hẹn</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.solidBtn, { backgroundColor: theme.brand }]}
                      onPress={() => router.push({ pathname: "/(customer)/book", params: { rescheduleId: item.id } })}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.solidBtnText}>Đổi ngày / giờ</Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Cancel Confirmation Prompt */}
                {isBooked && confirmingCancelId === item.id ? (
                  <View style={[styles.cancelConfirmBox, { backgroundColor: theme.danger,
                    borderColor: theme.danger }]}>
                    <View style={styles.cancelConfirmHeading}>
                      <Ionicons name="alert-circle-outline" size={20} color="#FFFFFF" />
                      <Text style={[styles.cancelConfirmTitle, { color: "#FFFFFF" }]}>Xác nhận hủy lịch hẹn</Text>
                    </View>
                    <Text style={[styles.cancelConfirmDescription, { color: "#FFFFFF" }]}>
                      Hủy lịch {formattedTime(item.startTime)}{item.branchName ? ` tại ${item.branchName}` : ""}?
                    </Text>
                    {actionError ? (
                      <Text style={{ color: "#FFFFFF", fontSize: 12 }}>{actionError}</Text>
                    ) : null}
                    <View style={styles.cancelConfirmActions}>
                      <Pressable
                        accessibilityRole="button"
                        style={[styles.cancelKeepBtn, { borderColor: "#FFFFFF", backgroundColor: "#FFFFFF" }]}
                        disabled={processingId !== null}
                        onPress={() => {
                          setConfirmingCancelId(null);
                          setActionError(null);
                        }}
                      >
                        <Text style={[styles.cancelKeepBtnText, { color: theme.danger }]}>Giữ lịch</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        style={[styles.cancelAcceptBtn, { backgroundColor: "#B91C1C", borderColor: "#FFFFFF" }]}
                        disabled={processingId !== null}
                        onPress={() => {
                          void handleCancel(item.id);
                        }}
                      >
                        {processingId === item.id ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <><Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.cancelAcceptBtnText}>Xác nhận hủy</Text></>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {/* Flow 2: Simulation Payment for completed appointments */}
                {isCompleted ? (
                  <View style={[styles.paymentBox, { backgroundColor: theme.surfaceHighlight }]}>
                    <Text style={[styles.paymentTitle, { color: theme.text }]}>
                      Thanh toán mô phỏng (không trừ tiền thật)
                    </Text>

                    <View style={styles.paymentOptionsRow}>
                      <Pressable
                        onPress={() => {
                          setProvider("momo");
                          pendingPayment.current = null;
                        }}
                        style={[
                          styles.payOptionPill,
                          {
                            backgroundColor: provider === "momo" ? theme.brand : theme.surface,
                            borderColor: provider === "momo" ? theme.brand : theme.border
                          }
                        ]}
                      >
                        <Text style={{ color: provider === "momo" ? "#FFFFFF" : theme.text, fontWeight: "700", fontSize: 12 }}>
                          MoMo {provider === "momo" ? "✓" : ""}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setProvider("vnpay");
                          pendingPayment.current = null;
                        }}
                        style={[
                          styles.payOptionPill,
                          {
                            backgroundColor: provider === "vnpay" ? theme.brand : theme.surface,
                            borderColor: provider === "vnpay" ? theme.brand : theme.border
                          }
                        ]}
                      >
                        <Text style={{ color: provider === "vnpay" ? "#FFFFFF" : theme.text, fontWeight: "700", fontSize: 12 }}>
                          VNPay {provider === "vnpay" ? "✓" : ""}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.paymentOptionsRow}>
                      <Pressable
                        onPress={() => {
                          setOutcome("success");
                          pendingPayment.current = null;
                        }}
                        style={[
                          styles.payOptionPill,
                          {
                            backgroundColor: outcome === "success" ? "#16A34A" : theme.surface,
                            borderColor: outcome === "success" ? "#16A34A" : theme.border
                          }
                        ]}
                      >
                        <Text style={{ color: outcome === "success" ? "#FFFFFF" : theme.text, fontSize: 12, fontWeight: "700" }}>
                          Giả lập thành công {outcome === "success" ? "✓" : ""}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setOutcome("failed");
                          pendingPayment.current = null;
                        }}
                        style={[
                          styles.payOptionPill,
                          {
                            backgroundColor: outcome === "failed" ? "#DC2626" : theme.surface,
                            borderColor: outcome === "failed" ? "#DC2626" : theme.border
                          }
                        ]}
                      >
                        <Text style={{ color: outcome === "failed" ? "#FFFFFF" : theme.text, fontSize: 12, fontWeight: "700" }}>
                          Giả lập thất bại {outcome === "failed" ? "✓" : ""}
                        </Text>
                      </Pressable>
                    </View>

                    <WizardAction
                      label="Thử thanh toán mô phỏng"
                      onPress={() => {
                        void handlePay(item.id);
                      }}
                      loading={processingId === item.id}
                    />

                    {paymentMessage ? (
                      <Text style={[styles.payMessage, { color: theme.brand }]}>{paymentMessage}</Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Paid Tag */}
                {isPaid ? (
                  <View style={styles.paidBadgeBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                    <Text style={styles.paidBadgeText}>
                      Đã thanh toán dịch vụ thành công qua mô phỏng.
                    </Text>
                  </View>
                ) : null}

                {/* Rebook & Warranty Buttons (Stitch Screen 3) */}
                {confirmingCancelId !== item.id ? <View style={styles.rebookRow}>
                  <Pressable
                    style={[styles.rebookBtn, { backgroundColor: theme.brand }]}
                    onPress={() => router.push("/(customer)/book")}
                  >
                    <Ionicons name="reload" size={14} color="#FFFFFF" />
                    <Text style={styles.rebookBtnText}>Đặt lại lịch này</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.warrantyBtn, { borderColor: theme.border }]}
                    onPress={() =>
                      Alert.alert(
                        "Bảo hành kiểu tóc 7 ngày",
                        "Kiểu tóc của bạn được bảo hành miễn phí 100% trong vòng 7 ngày kể từ ngày thực hiện. Ghé bất kỳ salon 30Shine nào để stylist căn chỉnh lại."
                      )
                    }
                  >
                    <Ionicons name="shield-checkmark-outline" size={14} color={theme.text} />
                    <Text style={[styles.warrantyBtnText, { color: theme.text }]}>Bảo hành kiểu tóc</Text>
                  </Pressable>
                </View> : null}
              </View>
            );
          })
        )}

        {actionError ? <Text style={[styles.generalError, { color: theme.danger }]}>{actionError}</Text> : null}

        {/* 5. 30Shine Exclusive Commitments (Matching Stitch Screen 3 Bottom) */}
        <View style={styles.commitmentsSection}>
          <Text style={[styles.commitmentsHeading, { color: theme.text }]}>
            CAM KẾT ĐỘC QUYỀN 30SHINE
          </Text>

          <View style={[styles.commitmentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.commitIconCircle, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="shield-checkmark" size={18} color="#2563EB" />
            </View>
            <View style={styles.commitTextCol}>
              <Text style={[styles.commitTitle, { color: theme.text }]}>
                Bảo hành tóc 7 ngày miễn phí toàn quốc
              </Text>
              <Text style={[styles.commitDesc, { color: theme.textMuted }]}>
                Nếu chưa ưng ý form tóc hoặc cần chỉnh sửa, thợ 30Shine hỗ trợ cắt lại hoàn toàn miễn phí.
              </Text>
            </View>
          </View>

          <View style={[styles.commitmentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.commitIconCircle, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="bag-check" size={18} color="#16A34A" />
            </View>
            <View style={styles.commitTextCol}>
              <Text style={[styles.commitTitle, { color: theme.text }]}>
                Đổi trả mỹ phẩm trong 7 ngày
              </Text>
              <Text style={[styles.commitDesc, { color: theme.textMuted }]}>
                Đổi trả sản phẩm mỹ phẩm tóc, gôm sáp nếu không hợp chất tóc mà không cần lý do.
              </Text>
            </View>
          </View>

          <View style={[styles.commitmentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.commitIconCircle, { backgroundColor: "#FFFBEB" }]}>
              <Ionicons name="time" size={18} color="#D97706" />
            </View>
            <View style={styles.commitTextCol}>
              <Text style={[styles.commitTitle, { color: theme.text }]}>
                Chờ quá 15 phút tặng ngay 50.000đ
              </Text>
              <Text style={[styles.commitDesc, { color: theme.textMuted }]}>
                Đặt lịch trước nhưng salon để Anh đợi quá 15 phút, tặng voucher 50.000đ trừ trực tiếp.
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Contact / Hotline Support Footer */}
        <View style={styles.supportFooter}>
          <Text style={[styles.supportFooterText, { color: theme.textMuted }]}>
            Cần hỗ trợ tra cứu hóa đơn cũ? Liên hệ
          </Text>
          <Pressable
            style={[styles.floatingHotlinePill, { backgroundColor: theme.brand }]}
            onPress={() => Linking.openURL("tel:1900272703").catch(() => {})}
          >
            <Text style={styles.floatingHotlineText}>Hotline 1900.27.27.03</Text>
            <Ionicons name="call" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  navyHeader: {
    paddingBottom: 16
  },
  safeHeader: {
    paddingHorizontal: 16
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 6 : 2
  },
  userHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  headerUserName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  headerLoginLink: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center"
  },
  hotlinePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4
  },
  hotlineText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 60,
    gap: 14
  },
  notLoggedInCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    alignItems: "flex-start"
  },
  notLoggedIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center"
  },
  notLoggedTitle: {
    color: "#1E3A8A",
    fontSize: 14,
    fontWeight: "800"
  },
  notLoggedSub: {
    color: "#1E40AF",
    fontSize: 12,
    lineHeight: 17
  },
  loginNowBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 4
  },
  loginNowBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  recoveryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8
  },
  recoveryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  recoveryTitle: {
    fontSize: 14,
    fontWeight: "800"
  },
  recoveryDesc: {
    fontSize: 12,
    lineHeight: 16
  },
  otpInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14
  },
  lookupCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8
  },
  lookupTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  lookupSub: {
    fontSize: 12
  },
  lookupInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
    gap: 6
  },
  phoneInput: {
    flex: 1,
    fontSize: 13,
    padding: 0
  },
  lookupBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  lookupBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6
  },
  sectionHeadingText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  appointmentCountText: {
    fontSize: 12
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8
  },
  errorCardTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  errorCardSub: {
    fontSize: 12
  },
  retryBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  appointmentCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6
  },
  bookedCard: {
    borderWidth: 2,
    elevation: 5,
    shadowOpacity: 0.13,
    shadowRadius: 10
  },
  bookedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingBottom: 2
  },
  bookedBannerText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  cardDateSub: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  cardDateTime: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2
  },
  cardPriceStatusCol: {
    alignItems: "flex-end",
    gap: 4
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "900"
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "800"
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E2E8F0"
  },
  cardDetailsList: {
    gap: 6
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  detailText: {
    fontSize: 13
  },
  lookbookSection: {
    borderRadius: 12,
    padding: 12,
    gap: 8
  },
  lookbookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  lookbookTitle: {
    fontSize: 12,
    fontWeight: "700"
  },
  lookbookAngleCount: {
    fontSize: 11,
    fontWeight: "700"
  },
  anglesRow: {
    flexDirection: "row",
    gap: 8
  },
  angleCard: {
    flex: 1,
    height: 80,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  anglePhotoPlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  angleLabelPill: {
    position: "absolute",
    bottom: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  angleLabelText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700"
  },
  reviewBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4
  },
  ratingStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  },
  ratingReviewLabel: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 6
  },
  reviewComment: {
    color: "#78350F",
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 16
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 10
  },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    minHeight: 44,
    gap: 6
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: "800"
  },
  solidBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    minHeight: 44,
    gap: 6
  },
  solidBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  cancelConfirmBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 10
  },
  cancelConfirmHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  cancelConfirmTitle: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1
  },
  cancelConfirmDescription: {
    fontSize: 13,
    lineHeight: 19
  },
  cancelConfirmActions: {
    flexDirection: "row",
    gap: 10
  },
  cancelKeepBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelKeepBtnText: {
    fontSize: 13,
    fontWeight: "700"
  },
  cancelAcceptBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelAcceptBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  paymentBox: {
    borderRadius: 12,
    padding: 12,
    gap: 8
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: "700"
  },
  paymentOptionsRow: {
    flexDirection: "row",
    gap: 8
  },
  payOptionPill: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center"
  },
  payMessage: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  paidBadgeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22, 163, 74, 0.1)",
    borderRadius: 8,
    padding: 10
  },
  paidBadgeText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700"
  },
  rebookRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2
  },
  rebookBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    height: 40,
    gap: 6
  },
  rebookBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  warrantyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    gap: 6
  },
  warrantyBtnText: {
    fontSize: 13,
    fontWeight: "700"
  },
  generalError: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  commitmentsSection: {
    gap: 10,
    marginTop: 8
  },
  commitmentsHeading: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  commitmentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10
  },
  commitIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  commitTextCol: {
    flex: 1,
    gap: 2
  },
  commitTitle: {
    fontSize: 13,
    fontWeight: "800"
  },
  commitDesc: {
    fontSize: 11,
    lineHeight: 16
  },
  supportFooter: {
    alignItems: "center",
    gap: 8,
    marginVertical: 12
  },
  supportFooterText: {
    fontSize: 12
  },
  floatingHotlinePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6
  },
  floatingHotlineText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  }
});
