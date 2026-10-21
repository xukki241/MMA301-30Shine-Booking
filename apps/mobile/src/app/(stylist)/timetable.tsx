// Stylist timetable - monthly shift calendar overview
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { InlineError } from "@/components/booking-wizard";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import { getStylistDaySchedule, getStylistMonthShifts, type StylistAppointmentItem,
  type StylistWorkShift } from "@/booking/http-adapter";
import { dateLabel, vietnamToday } from "@/stylist/date";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function monthCells(month: string): Array<string | null> {
  const [year, number] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, index) =>
    month + "-" + String(index + 1).padStart(2, "0"))];
}

function moveMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

function time(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit",
    minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export default function StylistTimetableScreen() {
  const theme = useAppTheme();
  const { token, role } = useAuth();
  const [month, setMonth] = useState(() => vietnamToday().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(vietnamToday);
  const [monthShifts, setMonthShifts] = useState<StylistWorkShift[]>([]);
  const [dayShifts, setDayShifts] = useState<StylistWorkShift[]>([]);
  const [appointments, setAppointments] = useState<StylistAppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const today = vietnamToday();
  const cells = useMemo(() => monthCells(month), [month]);
  const shiftDates = useMemo(() => new Set(monthShifts.map((shift) => shift.date)), [monthShifts]);

  const refresh = useCallback(async () => {
    if (!token || role !== "stylist") return;
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const [shifts, schedule] = await Promise.all([
        getStylistMonthShifts(token, month), getStylistDaySchedule(token, selectedDate),
      ]);
      if (request !== requestId.current) return;
      setMonthShifts(shifts);
      setDayShifts(schedule.workShifts);
      setAppointments(schedule.appointments);
    } catch (cause) {
      if (request === requestId.current) setError(cause instanceof Error ? cause.message : "Không tải được thời khóa biểu.");
    } finally { if (request === requestId.current) setLoading(false); }
  }, [token, role, month, selectedDate]);

  useFocusEffect(useCallback(() => { void refresh(); return () => { requestId.current += 1; }; }, [refresh]));

  function changeMonth(offset: number) {
    const next = moveMonth(month, offset);
    setMonth(next);
    setSelectedDate(next === vietnamToday().slice(0, 7) ? vietnamToday() : next + "-01");
  }

  return <Screen eyebrow="STYLIST" title="Thời khóa biểu"
    description="Ngày có chấm xanh là ngày đã được phân ca. Chọn một ngày để xem giờ làm và lịch hẹn."
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void refresh(); }}
      tintColor={theme.brand} colors={[theme.brand]} />}>
    <View style={styles.monthHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => changeMonth(-1)} style={styles.navButton}>
        <Ionicons name="chevron-back" size={20} color={theme.brand} />
      </Pressable>
      <Text style={[styles.monthTitle, { color: theme.text }]}>{dateLabel(month + "-01", { month: "long", year: "numeric" })}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => changeMonth(1)} style={styles.navButton}>
        <Ionicons name="chevron-forward" size={20} color={theme.brand} />
      </Pressable>
    </View>
    {error ? <InlineError message={error} onRetry={() => { void refresh(); }} /> : null}
    {loading ? <Text style={{ color: theme.textMuted, marginBottom: 10 }}>Đang tải thời khóa biểu...</Text> : null}
    <Card style={styles.calendarCard}>
      <View style={styles.grid}>
        {weekdays.map((day) => <Text key={day} style={[styles.weekday, { color: theme.textMuted }]}>{day}</Text>)}
        {cells.map((date, index) => date ? <Pressable key={date} accessibilityRole="button"
          accessibilityLabel={date + (date === today ? ", hôm nay" : "") + (shiftDates.has(date) ? ", có ca làm" : ", chưa có ca làm")}
          onPress={() => setSelectedDate(date)} style={[styles.day, date === today && { borderColor: theme.brand, borderWidth: 2 },
            selectedDate === date && { backgroundColor: theme.brand }]}>
          <Text style={[styles.dayText, { color: selectedDate === date ? "#FFFFFF" : theme.text }]}>{Number(date.slice(-2))}</Text>
          <View style={styles.dayMeta}>
            {shiftDates.has(date) ? <View style={[styles.dot, { backgroundColor: selectedDate === date ? "#FFFFFF" : theme.brand }]} /> : null}
            {date === today ? <Text style={[styles.todayLabel, { color: selectedDate === date ? "#FFFFFF" : theme.brand }]}>Hôm nay</Text> : null}
          </View>
        </Pressable> : <View key={"empty-" + index} style={styles.day} />)}
      </View>
    </Card>
    <Text style={[styles.selectedTitle, { color: theme.text }]}>{dateLabel(selectedDate, { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}</Text>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>Ca làm việc · {dayShifts.length}</Text>
    {loading ? null : dayShifts.length ? dayShifts.map((shift) => <Card key={shift.id}>
      <CardTitle>{time(shift.startAt)} – {time(shift.endAt)}</CardTitle>
    </Card>) : <Card><CardText>Ngày này chưa được phân ca.</CardText></Card>}
    <Text style={[styles.sectionTitle, { color: theme.text }]}>Lịch hẹn · {appointments.length}</Text>
    {loading ? null : appointments.length ? appointments.map((item) => <Card key={item.id}>
      <CardTitle>{time(item.startTime)} – {time(item.endTime)}</CardTitle>
      <CardText>{item.customerName || item.customerPhone || "Khách hàng"} · {item.serviceName || "Dịch vụ"}</CardText>
    </Card>) : <Card><CardText>Ngày này chưa có lịch hẹn.</CardText></Card>}
  </Screen>;
}

const styles = StyleSheet.create({
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthTitle: { fontSize: 19, fontWeight: "800", textTransform: "capitalize" },
  navButton: { padding: 10, borderRadius: 12, backgroundColor: "#FFFFFF" },
  calendarCard: { padding: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.2857%", textAlign: "center", fontSize: 12, fontWeight: "700", paddingVertical: 8 },
  day: { width: "14.2857%", height: 58, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 15, fontWeight: "700" },
  dayMeta: { height: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  todayLabel: { fontSize: 8, fontWeight: "800" },
  selectedTitle: { fontSize: 17, fontWeight: "800", textTransform: "capitalize", marginHorizontal: 16, marginTop: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginHorizontal: 16, marginBottom: 10, marginTop: 8 },
});
