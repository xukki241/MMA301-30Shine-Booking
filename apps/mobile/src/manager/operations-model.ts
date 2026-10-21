export function canSubmitMutation(connectivity: "online" | "offline" | "unknown"): boolean {
  return connectivity !== "offline";
}

export function createLatestRequestGate() {
  let current = 0;
  return {
    begin: () => ++current,
    isCurrent: (request: number) => request === current,
    invalidate: () => { current += 1; },
  };
}

export function validateServiceDraft(draft: { name: string; price: number; durationMinutes: number }): string | null {
  if (draft.name.trim().length < 2) return "Cần tên dịch vụ ít nhất 2 ký tự.";
  if (!Number.isSafeInteger(draft.price) || draft.price < 0) return "Giá dịch vụ không hợp lệ.";
  if (!Number.isSafeInteger(draft.durationMinutes) || draft.durationMinutes < 5 || draft.durationMinutes > 480) {
    return "Thời lượng phải từ 5 đến 480 phút.";
  }
  return null;
}

export function validateShiftDraft(draft: { stylistId: string; branchId: string; date: string;
  startAt: string; endAt: string }): string | null {
  if (!/^[a-f0-9]{24}$/i.test(draft.stylistId)) return "Cần chọn thợ hợp lệ.";
  if (!/^[a-f0-9]{24}$/i.test(draft.branchId)) return "Cần chọn chi nhánh.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
      !draft.startAt.startsWith(draft.date) || !draft.endAt.startsWith(draft.date)) return "Ngày ca không hợp lệ.";
  if (!Number.isFinite(Date.parse(draft.startAt)) || !Number.isFinite(Date.parse(draft.endAt)) ||
      new Date(draft.endAt) <= new Date(draft.startAt)) return "Giờ kết thúc phải sau giờ bắt đầu.";
  return null;
}

export function localTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}
