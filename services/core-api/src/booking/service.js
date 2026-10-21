const { ACTIONS, BookingError, isId, validateBooking, validatePayment } = require("./rules");

function createBookingService(repository) {
  return {
    async book(actor, body, snapshot = {}) {
      if (actor.role !== "customer") throw new BookingError(403, "Only customers can book");
      if (actor.guest) throw new BookingError(403, "Registered customer account required");
      const data = validateBooking(body);
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
      const updated = await repository.transition(id.toLowerCase(), action, {
        ...actor, userId: actor.userId.toLowerCase(),
      });
      if (!updated) throw new BookingError(400, "Appointment state changed; reload and retry");
      return updated;
    },
    async pay(actor, id, body) {
      if (!isId(id)) throw new BookingError(400, "Invalid appointment id");
      const input = validatePayment(body);
      const appointment = await repository.findById(id.toLowerCase());
      if (!appointment) throw new BookingError(404, "Appointment not found");
      const owns = actor.userId.toLowerCase() === appointment.customerId;
      if (actor.role !== "customer" || !owns) {
        throw new BookingError(403, "Appointment does not belong to this actor");
      }
      const previous = appointment.paymentAttempts?.find((item) => item.requestId === input.requestId);
      if (previous) {
        if (previous.provider !== input.provider || previous.status !== input.outcome) {
          throw new BookingError(409, "Payment requestId was used with different details");
        }
        return { appointment, attempt: previous };
      }
      if (appointment.status === "paid") throw new BookingError(409, "Appointment was already paid");
      if (appointment.status !== "completed") throw new BookingError(400, "Invalid appointment state");
      if (!Number.isSafeInteger(appointment.bookedPrice) || appointment.bookedPrice < 0 || !appointment.branchId) {
        throw new BookingError(409, "Appointment has no booked price; mock payment is unavailable");
      }
      const normalized = { ...actor, userId: actor.userId.toLowerCase() };
      const result = await repository.recordPayment(id.toLowerCase(), normalized, input, appointment);
      if (result) return result;
      const latest = await repository.findById(id.toLowerCase());
      const replay = latest?.paymentAttempts?.find((item) => item.requestId === input.requestId);
      if (replay && replay.provider === input.provider && replay.status === input.outcome) {
        return { appointment: latest, attempt: replay };
      }
      throw new BookingError(409, "Appointment payment changed; reload and retry");
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
      return repository.listByCustomer ? repository.listByCustomer(targetId) : [];
    },
  };
}
module.exports = { createBookingService };
