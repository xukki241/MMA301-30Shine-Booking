import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
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

import { formatDate, formatSlot, upcomingDates } from "@/booking/dates";
import { createHttpBookingAdapter } from "@/booking/http-adapter";
import { type BookingStep, useBookingOptions } from "@/booking/use-booking-options";
import {
  type AppointmentResult,
  type BookingDraft,
  type Branch,
  type Service,
  type Stylist,
  type TimeSlot,
  isCompleteBookingDraft
} from "@/booking/types";
import {
  BookingSummary,
  InlineError,
  SelectableCard,
  StepSectionHeader,
  WizardAction
} from "@/components/booking-wizard";
import { Card, CardText, CardTitle } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

const initialDraft: BookingDraft = {
  branch: null,
  service: null,
  stylist: null,
  date: null,
  slot: null
};

export default function CustomerBookingScreen() {
  const theme = useAppTheme();
  const { token: authToken, user } = useAuth();
  const dates = useMemo(() => upcomingDates(), []);
  const [step, setStep] = useState<BookingStep>(0);
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);
  const [result, setResult] = useState<AppointmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const submitLock = useRef(false);
  const tokenRef = useRef<string | null>(authToken);
  tokenRef.current = authToken;

  const bookingAdapter = useMemo(() => createHttpBookingAdapter(() => tokenRef.current), []);
  const { branches, services, stylists, slots, loading, error, retry } = useBookingOptions(
    step,
    draft,
    bookingAdapter
  );

  function selectBranch(branch: Branch) {
    setDraft((current) =>
      current.branch?.id === branch.id
        ? current
        : { branch, service: null, stylist: null, date: null, slot: null }
    );
  }

  function selectService(service: Service) {
    setDraft((current) =>
      current.service?.id === service.id
        ? current
        : { ...current, service, stylist: null, slot: null }
    );
  }

  function selectStylist(stylist: Stylist) {
    setDraft((current) =>
      current.stylist?.id === stylist.id
        ? current
        : { ...current, stylist, slot: null }
    );
  }

  function selectDate(date: string) {
    setDraft((current) =>
      current.date === date ? current : { ...current, date, slot: null }
    );
  }

  function selectSlot(slot: TimeSlot) {
    setDraft((current) => ({ ...current, slot }));
  }

  function goBack() {
    if (step === 0) router.back();
    else {
      setSubmitError(null);
      setStep((current) => (current - 1) as BookingStep);
    }
  }

  async function confirm() {
    if (submitLock.current || !isCompleteBookingDraft(draft)) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!tokenRef.current) throw new Error("Vui lòng nhập tên và số điện thoại để tiếp tục.");
      const appointment = await bookingAdapter.confirmBooking(draft);
      setResult(appointment);
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Không thể xác nhận lúc này. Vui lòng thử lại."
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  const canContinue =
    !loading &&
    !error &&
    ((step === 0 && branches.some((item) => item.id === draft.branch?.id)) ||
      (step === 1 && services.some((item) => item.id === draft.service?.id)) ||
      (step === 2 && stylists.some((item) => item.id === draft.stylist?.id)) ||
      (step === 3 && Boolean(draft.date && slots.some((item) => item.id === draft.slot?.id))));

  // Filter branches by search query
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const query = searchQuery.toLowerCase();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        (b.address && b.address.toLowerCase().includes(query))
    );
  }, [branches, searchQuery]);

  // Current price total calculation
  const currentTotal = draft.service?.priceVnd || 0;

  if (result) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.navyHeader, { backgroundColor: theme.brand }]}>
          <SafeAreaView edges={["top"]} style={styles.safeHeader}>
            <View style={styles.headerBar}>
              <Text style={styles.headerBrandTitle}>30SHINE BOOKING</Text>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.successCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.successIconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="checkmark-done" size={36} color="#16A34A" />
            </View>
            <Text style={[styles.successTitle, { color: theme.text }]}>Đặt lịch thành công!</Text>
            <Text style={[styles.successSubtitle, { color: theme.textMuted }]}>
              Mã lịch hẹn: <Text style={{ fontWeight: "800", color: theme.brand }}>{result.id}</Text>
            </Text>
            <Text style={[styles.successDesc, { color: theme.textMuted }]}>
              30Shine đã ghi nhận lịch hẹn của bạn. Vui lòng đến sớm trước 5 phút để trải nghiệm dịch vụ chu đáo nhất.
            </Text>
          </View>

          <BookingSummary booking={result.booking} />

          <View style={styles.actionPadding}>
            <WizardAction
              label="Về trang chủ"
              onPress={() => router.replace("/(customer)/home")}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  const displayName = user?.name
    ? user.name
    : user?.email
    ? user.email.split("@")[0].toUpperCase()
    : "GUEST";

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* 1. Deep Navy Header Section (Matching Stitch Screen 2) */}
      <View style={[styles.navyHeader, { backgroundColor: theme.brand }]}>
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <View style={styles.headerBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={goBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>

            <View style={styles.userHeaderInfo}>
              <View style={styles.smallAvatar}>
                <Ionicons name="person" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerUserName}>{displayName}</Text>
                <Text style={styles.headerUserSub}>
                  {user?.phone ? user.phone : "Khách vãng lai"}
                </Text>
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

      {/* 2. Customer Hint Banner (Amber box from Stitch Screenshot 2) */}
      {!tokenRef.current ? (
        <View style={styles.guestBanner}>
          <Ionicons name="ribbon" size={20} color="#D97706" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.guestBannerTitle}>
              Anh đang đặt lịch với tư cách <Text style={{ fontWeight: "800" }}>KHÁCH</Text>
            </Text>
            <Text style={styles.guestBannerSub}>
              Đăng nhập để tích điểm Shine Member và nhận ưu đãi bảo hành form tóc.
            </Text>
          </View>
          <Pressable
            style={styles.loginSmallBtn}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginSmallBtnText}>Đăng nhập</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Step Indicator Bar */}
        <View style={styles.stepTrackContainer}>
          {[0, 1, 2, 3, 4].map((idx) => {
            const isCompleted = idx < step;
            const isCurrent = idx === step;
            return (
              <View
                key={idx}
                style={[
                  styles.stepTrackSegment,
                  {
                    backgroundColor: isCompleted || isCurrent ? theme.brand : theme.border
                  }
                ]}
              />
            );
          })}
        </View>

        {/* 3. Section 1: Choose Salon */}
        {step === 0 ? (
          <View style={styles.sectionWrap}>
            <StepSectionHeader
              stepNumber={1}
              title="CHỌN SALON GẦN BẠN"
              rightAction={
                <View style={styles.openStatusTag}>
                  <View style={styles.greenDot} />
                  <Text style={styles.openStatusText}>Đang mở cửa</Text>
                </View>
              }
            />

            {/* Search Input Bar */}
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Tìm kiếm salon (quận, đường)..."
                placeholderTextColor={theme.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={theme.textDim} />
                </Pressable>
              ) : null}
            </View>

            {loading ? (
              <LoadingState label="Đang tải danh sách salon..." />
            ) : error ? (
              <InlineError message={error} onRetry={retry} />
            ) : filteredBranches.length === 0 ? (
              <EmptyState
                icon="location-outline"
                title="Không tìm thấy salon"
                description="Thử tìm kiếm với tên đường hoặc quận khác."
              />
            ) : (
              filteredBranches.map((branch, index) => {
                const isSelected = draft.branch?.id === branch.id;
                return (
                  <SelectableCard
                    key={branch.id}
                    label={branch.name}
                    detail={branch.address}
                    badge={index === 0 ? "GẦN NHẤT" : undefined}
                    iconName="location-outline"
                    selected={isSelected}
                    onPress={() => selectBranch(branch)}
                  />
                );
              })
            )}
          </View>
        ) : (
          /* Collapsed Salon Card for Subsequent Steps */
          <View style={[styles.collapsedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.collapsedLeft}>
              <View style={[styles.stepMiniBadge, { backgroundColor: theme.brand }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.collapsedLabel, { color: theme.textMuted }]}>Salon đã chọn</Text>
                <Text style={[styles.collapsedValue, { color: theme.text }]} numberOfLines={1}>
                  {draft.branch?.name}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setStep(0)}>
              <Text style={[styles.changeLink, { color: theme.brand }]}>Đổi salon</Text>
            </Pressable>
          </View>
        )}

        {/* 4. Section 2: Choose Service */}
        {step === 1 ? (
          <View style={styles.sectionWrap}>
            <StepSectionHeader
              stepNumber={2}
              title="CHỌN DỊCH VỤ"
              subtitle={draft.service ? "1 dịch vụ đã chọn" : "Chọn dịch vụ mong muốn"}
            />

            {loading ? (
              <LoadingState label="Đang tải bảng giá dịch vụ..." />
            ) : error ? (
              <InlineError message={error} onRetry={retry} />
            ) : services.length === 0 ? (
              <EmptyState
                icon="cut-outline"
                title="Chưa có dịch vụ"
                description="Salon này hiện chưa có danh sách dịch vụ. Vui lòng chọn salon khác."
              />
            ) : (
              services.map((service, idx) => {
                const isSelected = draft.service?.id === service.id;
                const formattedPrice = `${new Intl.NumberFormat("vi-VN").format(service.priceVnd)} ₫`;
                return (
                  <SelectableCard
                    key={service.id}
                    label={service.name}
                    detail={`${service.durationMinutes} phút dịch vụ`}
                    price={formattedPrice}
                    badge={idx === 0 ? "TOP 1" : idx === 1 ? "HOT" : undefined}
                    iconName="cut-outline"
                    selected={isSelected}
                    onPress={() => selectService(service)}
                  />
                );
              })
            )}
          </View>
        ) : step > 1 && draft.service ? (
          /* Collapsed Service Card */
          <View style={[styles.collapsedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.collapsedLeft}>
              <View style={[styles.stepMiniBadge, { backgroundColor: theme.brand }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.collapsedLabel, { color: theme.textMuted }]}>Dịch vụ đã chọn</Text>
                <Text style={[styles.collapsedValue, { color: theme.text }]}>
                  {draft.service.name} • {new Intl.NumberFormat("vi-VN").format(draft.service.priceVnd)} ₫
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setStep(1)}>
              <Text style={[styles.changeLink, { color: theme.brand }]}>Đổi</Text>
            </Pressable>
          </View>
        ) : null}

        {/* 5. Section 3: Choose Stylist */}
        {step === 2 ? (
          <View style={styles.sectionWrap}>
            <StepSectionHeader
              stepNumber={3}
              title="CHỌN STYLIST"
              subtitle="Stylist chuẩn tay nghề 5 sao 30Shine"
            />

            {loading ? (
              <LoadingState label="Đang tải danh sách stylist..." />
            ) : error ? (
              <InlineError message={error} onRetry={retry} />
            ) : stylists.length === 0 ? (
              <EmptyState
                icon="person-outline"
                title="Chưa có Stylist trực"
                description="Khung giờ hiện tại chưa có Stylist khả dụng. Vui lòng thử lại sau."
              />
            ) : (
              stylists.map((stylist, idx) => {
                const isSelected = draft.stylist?.id === stylist.id;
                return (
                  <SelectableCard
                    key={stylist.id}
                    label={stylist.name}
                    detail={idx === 0 ? "Xếp nhanh nhất • Master Stylist 5 sao" : "Stylist chuyên nghiệp"}
                    iconName="person-outline"
                    badge={idx === 0 ? "ĐỀ XUẤT" : undefined}
                    selected={isSelected}
                    onPress={() => selectStylist(stylist)}
                  />
                );
              })
            )}
          </View>
        ) : step > 2 && draft.stylist ? (
          /* Collapsed Stylist Card */
          <View style={[styles.collapsedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.collapsedLeft}>
              <View style={[styles.stepMiniBadge, { backgroundColor: theme.brand }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.collapsedLabel, { color: theme.textMuted }]}>Stylist</Text>
                <Text style={[styles.collapsedValue, { color: theme.text }]}>
                  {draft.stylist.name}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setStep(2)}>
              <Text style={[styles.changeLink, { color: theme.brand }]}>Đổi</Text>
            </Pressable>
          </View>
        ) : null}

        {/* 6. Section 4: Choose Date & Time */}
        {step === 3 ? (
          <View style={styles.sectionWrap}>
            <StepSectionHeader
              stepNumber={4}
              title="CHỌN NGÀY & GIỜ CẮT"
              subtitle="Chọn ngày để xem các khung giờ còn trống"
            />

            {/* Horizontal Date Tabs */}
            <View style={styles.dateTabsWrap}>
              <Text style={[styles.subSectionTitle, { color: theme.text }]}>CHỌN NGÀY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalDatesScroll}
              >
                {dates.map((d, index) => {
                  const isSelected = draft.date === d.key;
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => selectDate(d.key)}
                      style={[
                        styles.dateTabPill,
                        {
                          backgroundColor: isSelected ? theme.brand : theme.surface,
                          borderColor: isSelected ? theme.brand : theme.border
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateTabDayName,
                          { color: isSelected ? "rgba(255,255,255,0.8)" : theme.textMuted }
                        ]}
                      >
                        {index === 0 ? "HÔM NAY" : `NGÀY`}
                      </Text>
                      <Text
                        style={[
                          styles.dateTabDayNumber,
                          { color: isSelected ? "#FFFFFF" : theme.text }
                        ]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time Slot Grid */}
            <View style={styles.timeSlotsWrap}>
              <Text style={[styles.subSectionTitle, { color: theme.text }]}>
                KHUNG GIỜ CÒN TRỐNG
              </Text>

              {!draft.date ? (
                <View style={[styles.hintCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.hintCardText, { color: theme.textMuted }]}>
                    Vui lòng chọn ngày ở trên để xem các khung giờ còn trống.
                  </Text>
                </View>
              ) : loading ? (
                <LoadingState label="Đang kiểm tra ghế trống..." />
              ) : error ? (
                <InlineError message={error} onRetry={retry} />
              ) : slots.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="Hết ghế trống"
                  description="Khung giờ ngày này đã kín. Bạn hãy thử chọn ngày khác nhé."
                />
              ) : (
                <View style={styles.slotsGrid}>
                  {slots.map((slot) => {
                    const isSelected = draft.slot?.id === slot.id;
                    return (
                      <Pressable
                        key={slot.id}
                        onPress={() => selectSlot(slot)}
                        style={[
                          styles.slotPill,
                          {
                            backgroundColor: isSelected ? theme.brand : theme.surface,
                            borderColor: isSelected ? theme.brand : theme.border
                          }
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                        ) : null}
                        <Text
                          style={[
                            styles.slotPillText,
                            { color: isSelected ? "#FFFFFF" : theme.text }
                          ]}
                        >
                          {formatSlot(slot)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* 7. Section 5: Review & Confirm */}
        {step === 4 && isCompleteBookingDraft(draft) ? (
          <View style={styles.sectionWrap}>
            <StepSectionHeader
              stepNumber={5}
              title="THÔNG TIN KHÁCH & XÁC NHẬN"
              subtitle="Kiểm tra lại toàn bộ thông tin trước khi đặt"
            />

            {/* Customer Contact Box */}
            <View style={[styles.customerInfoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.inputFieldLabel, { color: theme.text }]}>Tên của anh *</Text>
              <TextInput
                style={[styles.customerTextInput, { color: theme.text, borderColor: theme.border }]}
                value={user?.name || "Quý khách"}
                editable={false}
              />

              <Text style={[styles.inputFieldLabel, { color: theme.text, marginTop: 8 }]}>
                Số điện thoại nhận tin đặt lịch *
              </Text>
              <TextInput
                style={[styles.customerTextInput, { color: theme.text, borderColor: theme.border }]}
                value={user?.phone || "(Chưa có số - SMS sẽ nhận qua app)"}
                editable={false}
              />
            </View>

            <BookingSummary booking={draft} />

            {submitError ? <InlineError message={submitError} /> : null}
          </View>
        ) : null}
      </ScrollView>

      {/* 8. Sticky Bottom Bar (Matching Stitch Screen 2) */}
      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View style={styles.bottomBarLeft}>
          <Text style={[styles.bottomBarSub, { color: theme.textMuted }]}>
            {draft.service ? "TẠM TÍNH (1 DỊCH VỤ)" : "BƯỚC " + (step + 1) + "/5"}
          </Text>
          <Text style={[styles.bottomBarPrice, { color: theme.brand }]}>
            {currentTotal > 0
              ? `${new Intl.NumberFormat("vi-VN").format(currentTotal)} VNĐ`
              : "0 VNĐ"}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={step === 4 ? !isCompleteBookingDraft(draft) || submitting : !canContinue}
          onPress={() => {
            if (step === 4) {
              void confirm();
            } else {
              setStep((current) => (current + 1) as BookingStep);
            }
          }}
          style={[
            styles.bottomBarBtn,
            {
              backgroundColor: theme.brand,
              opacity: (step === 4 ? isCompleteBookingDraft(draft) : canContinue) ? 1 : 0.4
            }
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.bottomBarBtnText}>
                {step === 4 ? "XÁC NHẬN ĐẶT LỊCH NGAY" : "TIẾP TỤC"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  navyHeader: {
    paddingBottom: 14
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  userHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginLeft: 12
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  headerUserName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  headerUserSub: {
    color: "rgba(255, 255, 255, 0.7)",
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
  headerBrandTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10
  },
  guestBannerTitle: {
    color: "#92400E",
    fontSize: 12
  },
  guestBannerSub: {
    color: "#B45309",
    fontSize: 11,
    lineHeight: 15
  },
  loginSmallBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D97706",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  loginSmallBtnText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800"
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 10
  },
  stepTrackContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8
  },
  stepTrackSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2
  },
  sectionWrap: {
    gap: 8
  },
  openStatusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981"
  },
  openStatusText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700"
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 6
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0
  },
  collapsedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  collapsedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  stepMiniBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  collapsedLabel: {
    fontSize: 11,
    fontWeight: "600"
  },
  collapsedValue: {
    fontSize: 13,
    fontWeight: "700"
  },
  changeLink: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8
  },
  dateTabsWrap: {
    marginHorizontal: 16,
    gap: 8,
    marginTop: 4
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  horizontalDatesScroll: {
    gap: 8,
    paddingVertical: 4
  },
  dateTabPill: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 78
  },
  dateTabDayName: {
    fontSize: 10,
    fontWeight: "700"
  },
  dateTabDayNumber: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2
  },
  timeSlotsWrap: {
    marginHorizontal: 16,
    gap: 10,
    marginTop: 14
  },
  hintCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center"
  },
  hintCardText: {
    fontSize: 13
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  slotPill: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minWidth: "22%"
  },
  slotPillText: {
    fontSize: 13,
    fontWeight: "800"
  },
  customerInfoCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: "700"
  },
  customerTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    backgroundColor: "rgba(0,0,0,0.02)"
  },
  successCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "900"
  },
  successSubtitle: {
    fontSize: 14
  },
  successDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 4
  },
  actionPadding: {
    paddingHorizontal: 16,
    marginTop: 16
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },
  bottomBarLeft: {
    gap: 2
  },
  bottomBarSub: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  bottomBarPrice: {
    fontSize: 16,
    fontWeight: "900"
  },
  bottomBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 44,
    gap: 6
  },
  bottomBarBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3
  }
});
