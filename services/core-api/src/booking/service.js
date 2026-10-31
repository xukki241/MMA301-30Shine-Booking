const { ACTIONS, BookingError, isId, validateBooking, validateReschedule } = require("./rules");

function createBookingService(repository) {
  return {
    async book(actor, body, snapshot = {}) {
      if (actor.role !== "customer") throw new BookingError(403, "Only customers can book");
      if (actor.guest) throw new BookingError(403, "Registered customer account required");
      const data = validateBooking(body);
      if (repository.listByCustomer) {
        const current = await repository.listByCustomer(actor.userId.toLowerCase());
        if (current.some((item) => item.status === "booked" && new Date(item.startTime).getTime() > Date.now())) {
          throw new BookingError(409, "Hãy hủy lịch hẹn sắp tới trước khi đặt lịch mới");
        }
      }
      // Ownership comes from verified JWT, never a supplied customerId.
      return repository.book({ ...data, ...snapshot, customerId: actor.userId.toLowerCase(),
        ...(actor.name && actor.phone ? { customerName: actor.name, customerPhone: actor.phone } : {}) });
    },
    async transition(actor, id, action) {
      if (!isId(id)) throw new BookingError(400, "Invalid appointment id");
      const rule = ACTIONS[action];
      if (!rule) throw new BookingError(400, "Invalid appointment action");
      const appointment = await repository.findById(id.toLowerCase());
      if (!appointment) throw new BookingError(404, "Appointment not found");
      const owns = actor.userId.toLowerCase() === appointment[rule.owner];
      if (actor.role !== rule.role || !owns) {
        throw new BookingError(403, "Appointment does not belong to this actor");
      }
      if (appointment.status !== rule.from) throw new BookingError(400, "Invalid appointment state");
      const now = new Date();
      if (action === "cancel" && now >= new Date(appointment.startTime)) {
        throw new BookingError(400, "Appointment can only be cancelled before it starts");
      }
      if (action === "no_show" && now.getTime() < new Date(appointment.startTime).getTime() + 15 * 60000) {
        throw new BookingError(400, "Wait 15 minutes after the appointment start before marking no-show");
      }
      if (action === "undo_check_in" && (!appointment.checkedInAt ||
          now.getTime() - new Date(appointment.checkedInAt).getTime() > 5 * 60000)) {
        throw new BookingError(400, "Check-in can only be undone within five minutes");
      }
      const updated = await repository.transition(id.toLowerCase(), action, {
        ...actor, userId: actor.userId.toLowerCase(), now,
      });
      if (!updated) throw new BookingError(400, "Appointment state changed; reload and retry");
      return updated;
    },
    async reschedule(actor, id, body, workShiftRepository) {
      if (!isId(id)) throw new BookingError(400, "Invalid appointment id");
      const times = validateReschedule(body);
      const appointment = await repository.findById(id.toLowerCase());
      if (!appointment) throw new BookingError(404, "Appointment not found");
      if (actor.role !== "customer" || actor.userId.toLowerCase() !== appointment.customerId) {
        throw new BookingError(403, "Appointment does not belong to this actor");
      }
      if (appointment.status !== "booked") throw new BookingError(400, "Invalid appointment state");
      const serviceId = times.serviceId || appointment.serviceId;
      if (times.startTime.getTime() === new Date(appointment.startTime).getTime() &&
          times.endTime.getTime() === new Date(appointment.endTime).getTime() &&
          serviceId === appointment.serviceId) return appointment;
      if (!workShiftRepository || !appointment.branchId || !appointment.serviceId) {
        throw new BookingError(409, "Appointment cannot be rescheduled");
      }
      const snapshot = await workShiftRepository.validateBooking({ stylistId: appointment.stylistId,
        branchId: appointment.branchId, serviceId, startTime: times.startTime, endTime: times.endTime,
        excludeAppointmentId: id.toLowerCase() });
      const updated = await repository.reschedule(id.toLowerCase(), {
        userId: actor.userId.toLowerCase(), stylistId: appointment.stylistId },
        { ...times, serviceId, ...snapshot });
      if (!updated) throw new BookingError(409, "New time is unavailable; please choose another slot");
      return updated;
    },
    async listStylistAppointments(actor, date) {
      if (actor.role !== "stylist") throw new BookingError(403, "Only stylists can access stylist appointments");
      return repository.listByStylist ? repository.listByStylist(actor.userId, date) : [];
    },
    async listCustomerAppointments(actor, customerId) {
      if (actor.role !== "customer") {
        throw new BookingError(403, "Only customers can access their appointments");
      }
      const targetId = customerId ? customerId.toLowerCase() : actor.userId.toLowerCase();
      if (actor.role === "customer" && targetId !== actor.userId.toLowerCase()) {
        throw new BookingError(403, "Cannot access another customer's appointments");
      }
      if (repository.markOverdueNoShows) {
        await repository.markOverdueNoShows(targetId, new Date());
      }
      return repository.listByCustomer ? repository.listByCustomer(targetId) : [];
    },
  };
}
module.exports = { createBookingService };
