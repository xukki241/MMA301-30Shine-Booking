import { localDateKey, parseLocalDate } from "./dates";
import type {
  AppointmentResult,
  BookingWizardDataSource,
  Branch,
  CompleteBookingDraft,
  Service,
  Stylist,
  TimeSlot,
  TimeSlotQuery
} from "./types";

// Demo catalog is intentionally local to this adapter. It is not a copy of backend data.
const branches: Branch[] = [
  { id: "branch-q1", name: "30Shine Quận 1", address: "Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh" },
  { id: "branch-q3", name: "30Shine Quận 3", address: "Cao Thắng, Quận 3, TP. Hồ Chí Minh" }
];

const services: Array<Service & { branchIds: string[] }> = [
  { id: "service-cut", name: "Cắt tóc", durationMinutes: 45, priceVnd: 120_000, branchIds: ["branch-q1", "branch-q3"] },
  { id: "service-wash", name: "Gội & tạo kiểu", durationMinutes: 30, priceVnd: 80_000, branchIds: ["branch-q1"] },
  { id: "service-style", name: "Cắt & tạo kiểu", durationMinutes: 60, priceVnd: 180_000, branchIds: ["branch-q3"] }
];

const stylists: Array<Stylist & { branchId: string; serviceIds: string[]; hours: number[] }> = [
  { id: "stylist-an", name: "Stylist An", branchId: "branch-q1", serviceIds: ["service-cut", "service-wash"], hours: [9, 11, 14, 16] },
  { id: "stylist-binh", name: "Stylist Bình", branchId: "branch-q1", serviceIds: ["service-cut"], hours: [10, 13, 15, 17] },
  { id: "stylist-chi", name: "Stylist Chi", branchId: "branch-q3", serviceIds: ["service-cut", "service-style"], hours: [9, 12, 15, 17] },
  { id: "stylist-dung", name: "Stylist Dũng", branchId: "branch-q3", serviceIds: ["service-style"], hours: [10, 13, 16] }
];

function publicService(service: Service & { branchIds: string[] }): Service {
  const { id, name, durationMinutes, priceVnd } = service;
  return { id, name, durationMinutes, priceVnd };
}

function publicStylist(stylist: Stylist & { branchId: string; serviceIds: string[]; hours: number[] }): Stylist {
  return { id: stylist.id, name: stylist.name };
}

export const demoBookingAdapter: BookingWizardDataSource = {
  async listBranches() {
    return branches.map((branch) => ({ ...branch }));
  },
  async listServices(branchId) {
    return services.filter((service) => service.branchIds.includes(branchId)).map(publicService);
  },
  async listStylists(branchId, serviceId) {
    return stylists
      .filter((stylist) => stylist.branchId === branchId && stylist.serviceIds.includes(serviceId))
      .map(publicStylist);
  },
  async listTimeSlots({ branchId, serviceId, stylistId, date }: TimeSlotQuery): Promise<TimeSlot[]> {
    const day = parseLocalDate(date);
    const stylist = stylists.find((item) => item.id === stylistId && item.branchId === branchId && item.serviceIds.includes(serviceId));
    const service = services.find((item) => item.id === serviceId && item.branchIds.includes(branchId));
    if (!day || !stylist || !service) throw new Error("Không thể tải khung giờ cho lựa chọn hiện tại.");
    if (localDateKey(day) < localDateKey(new Date()) || day.getDay() === 0) return [];

    const now = Date.now();
    return stylist.hours
      .filter((_, index) => (day.getDay() + index + stylists.indexOf(stylist)) % 3 !== 0)
      .map((hour) => {
        const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
        const end = new Date(start.getTime() + service.durationMinutes * 60_000);
        return {
          id: `${stylistId}-${date}-${hour}`,
          startTime: start.toISOString(),
          endTime: end.toISOString()
        };
      })
      .filter((slot) => new Date(slot.startTime).getTime() > now);
  },
  async confirmBooking(booking: CompleteBookingDraft): Promise<AppointmentResult> {
    const branchExists = branches.some((item) => item.id === booking.branch.id);
    const serviceExists = services.some((item) => item.id === booking.service.id && item.branchIds.includes(booking.branch.id));
    const stylistExists = stylists.some((item) => item.id === booking.stylist.id && item.branchId === booking.branch.id && item.serviceIds.includes(booking.service.id));
    if (!branchExists || !serviceExists || !stylistExists) {
      throw new Error("Lựa chọn đã thay đổi. Vui lòng kiểm tra lại từ bước đầu.");
    }
    const slots = await this.listTimeSlots({
      branchId: booking.branch.id,
      serviceId: booking.service.id,
      stylistId: booking.stylist.id,
      date: booking.date
    });
    if (!slots.some((slot) => slot.id === booking.slot.id && slot.startTime === booking.slot.startTime && slot.endTime === booking.slot.endTime)) {
      throw new Error("Khung giờ này không còn khả dụng. Vui lòng quay lại chọn giờ khác.");
    }
    // No server request or persistence: this result demonstrates the booked status only.
    return { id: `demo-${booking.slot.id}`, status: "booked", mode: "demo", booking };
  }
};
