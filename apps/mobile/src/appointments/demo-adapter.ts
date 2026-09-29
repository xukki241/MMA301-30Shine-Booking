import type { CustomerAppointment, CustomerAppointmentDataSource } from "./types";

function dayAt(offset: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function sampleAppointments(): CustomerAppointment[] {
  return [
    { id: "demo-upcoming", branchName: "30Shine Quận 1", serviceName: "Cắt tóc", stylistName: "Stylist An", startTime: dayAt(1, 10), status: "booked" },
    { id: "demo-completed", branchName: "30Shine Quận 3", serviceName: "Cắt và tạo kiểu", stylistName: "Stylist Bình", startTime: dayAt(-1, 14), status: "completed" },
    { id: "demo-paid", branchName: "30Shine Quận 1", serviceName: "Gội và tạo kiểu", stylistName: "Stylist An", startTime: dayAt(-7, 9), status: "paid" },
    { id: "demo-cancelled", branchName: "30Shine Quận 3", serviceName: "Cắt tóc", stylistName: "Stylist Bình", startTime: dayAt(-14, 16), status: "cancelled" }
  ];
}

// Local-only data source until customer appointment listing and auth are available.
export function createDemoAppointmentDataSource(
  initialAppointments: CustomerAppointment[] = sampleAppointments()
): CustomerAppointmentDataSource {
  const appointments = initialAppointments.map((appointment) => ({ ...appointment }));

  return {
    async list() {
      return appointments.map((appointment) => ({ ...appointment }));
    },
    async cancel(id) {
      const appointment = appointments.find((item) => item.id === id);
      if (!appointment) throw new Error("Không tìm thấy lịch hẹn. Vui lòng tải lại danh sách.");
      if (appointment.status !== "booked") {
        throw new Error("Chỉ có thể hủy lịch hẹn đang ở trạng thái đã đặt.");
      }

      appointment.status = "cancelled";
      return { ...appointment };
    }
  };
}

export const demoAppointmentDataSource = createDemoAppointmentDataSource();
