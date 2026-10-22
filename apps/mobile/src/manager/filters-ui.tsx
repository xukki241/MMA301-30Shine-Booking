import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/constants/theme";
import { dateLabel, shiftDate, vietnamToday } from "@/stylist/date";

export type SelectOption = { value: string; label: string };

export function ManagerSelect({ label, value, options, onChange, placeholder = "Chọn", searchable = false }: {
  label: string; value: string; options: SelectOption[]; onChange: (value: string) => void; placeholder?: string; searchable?: boolean;
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const visibleOptions = searchable ? options.filter((option) => option.label.toLocaleLowerCase("vi")
    .includes(query.trim().toLocaleLowerCase("vi"))) : options;
  return <View style={styles.filterWrap}>
    <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label || placeholder}`}
      onPress={() => { setQuery(""); setOpen(true); }} style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text numberOfLines={1} style={[styles.triggerText, { color: theme.text }]}>{selected?.label || placeholder}</Text>
      <Ionicons name="chevron-down" size={18} color={theme.brand} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={[styles.modal, { backgroundColor: theme.surface }]}>
        <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>{label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setOpen(false)}>
            <Ionicons name="close" size={24} color={theme.textMuted} /></Pressable></View>
        {searchable && <TextInput accessibilityLabel={`Tìm ${label.toLowerCase()}`} value={query} onChangeText={setQuery}
          placeholder="Tìm theo tên hoặc email" placeholderTextColor={theme.textMuted}
          style={[styles.search, { color: theme.text, borderColor: theme.border }]} />}
        <ScrollView style={styles.options}>
          {visibleOptions.length === 0 && <Text style={[styles.emptyOptions, { color: theme.textMuted }]}>Không có tài khoản phù hợp.</Text>}
          {visibleOptions.map((option) => <Pressable key={option.value} accessibilityRole="button"
            accessibilityLabel={option.label} accessibilityState={{ selected: value === option.value }}
            onPress={() => { onChange(option.value); setOpen(false); }}
            style={[styles.option, { borderBottomColor: theme.border }]}>
            <Text style={[styles.optionText, { color: value === option.value ? theme.brand : theme.text }]}>{option.label}</Text>
            {value === option.value && <Ionicons name="checkmark-circle" size={20} color={theme.brand} />}
          </Pressable>)}
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}

export function ManagerDatePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 7));
  const [yearNumber, monthNumber] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(yearNumber, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(yearNumber, monthNumber, 0)).getUTCDate();
  const today = vietnamToday();
  function choose(date: string) { onChange(date); setMonth(date.slice(0, 7)); setOpen(false); }
  function move(months: number) {
    setMonth((current) => {
      const [year, monthIndex] = current.split("-").map(Number);
      return new Date(Date.UTC(year, monthIndex - 1 + months, 1)).toISOString().slice(0, 7);
    });
  }
  return <View style={styles.filterWrap}>
    <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    <View style={styles.dateRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ngày trước" onPress={() => onChange(shiftDate(value, -1))}
        style={[styles.dateArrow, { borderColor: theme.border, backgroundColor: theme.surface }]}><Ionicons name="chevron-back" size={20} color={theme.brand} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ${label.toLowerCase()}`}
        onPress={() => { setMonth(value.slice(0, 7)); setOpen(true); }} style={[styles.trigger, styles.dateTrigger,
          { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Ionicons name="calendar-outline" size={18} color={theme.brand} />
        <Text style={[styles.triggerText, { color: theme.text }]}>{dateLabel(value, { day: "numeric", month: "numeric", year: "numeric" })}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.brand} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Ngày sau" onPress={() => onChange(shiftDate(value, 1))}
        style={[styles.dateArrow, { borderColor: theme.border, backgroundColor: theme.surface }]}><Ionicons name="chevron-forward" size={20} color={theme.brand} /></Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={[styles.modal, { backgroundColor: theme.surface }]}>
        <View style={styles.monthHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => move(-1)}><Ionicons name="chevron-back" size={24} color={theme.brand} /></Pressable>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{dateLabel(`${month}-01`, { month: "long", year: "numeric" })}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => move(1)}><Ionicons name="chevron-forward" size={24} color={theme.brand} /></Pressable>
        </View>
        <View style={styles.calendarGrid}>
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <Text key={day} style={[styles.weekday, { color: theme.textMuted }]}>{day}</Text>)}
          {Array.from({ length: offset }, (_, index) => <View key={`empty-${index}`} style={styles.dayCell} />)}
          {Array.from({ length: days }, (_, index) => {
            const day = `${month}-${String(index + 1).padStart(2, "0")}`;
            return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Chọn ngày ${day}`}
              accessibilityState={{ selected: day === value }} onPress={() => choose(day)}
              style={[styles.dayCell, day === value && { backgroundColor: theme.brand, borderRadius: 20 }]}>
              <Text style={{ color: day === value ? "#FFFFFF" : day === today ? theme.brand : theme.text,
                fontWeight: day === value || day === today ? "800" : "500" }}>{index + 1}</Text>
            </Pressable>;
          })}
        </View>
        <Pressable accessibilityRole="button" onPress={() => choose(today)} style={styles.todayButton}>
          <Text style={{ color: theme.brand, fontWeight: "800" }}>Về hôm nay</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.closeButton}>
          <Text style={{ color: theme.textMuted }}>Đóng</Text></Pressable>
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  filterWrap: { marginHorizontal: 16, gap: 6 },
  label: { fontSize: 12, fontWeight: "800" },
  trigger: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  triggerText: { fontSize: 14, fontWeight: "700", flex: 1 },
  dateRow: { flexDirection: "row", gap: 8 },
  dateArrow: { width: 46, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dateTrigger: { flex: 1, justifyContent: "flex-start" },
  overlay: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0F172A99" },
  modal: { borderRadius: 20, padding: 18, maxHeight: "75%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 17, fontWeight: "800", textTransform: "capitalize" },
  options: { flexGrow: 0 },
  option: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  optionText: { fontSize: 15, fontWeight: "600", flex: 1 },
  search: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 12, marginBottom: 8 },
  emptyOptions: { textAlign: "center", padding: 16, fontSize: 13 },
  monthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.2857%", textAlign: "center", paddingVertical: 7, fontSize: 11, fontWeight: "700" },
  dayCell: { width: "14.2857%", height: 40, alignItems: "center", justifyContent: "center" },
  todayButton: { alignSelf: "center", padding: 12, marginTop: 10 },
  closeButton: { alignSelf: "center", padding: 8 },
});
