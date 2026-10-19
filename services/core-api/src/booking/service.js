const { ACTIONS, BookingError, isId, validateBooking } = require("./rules");

function createBookingService(repository) {
  return {
    async book(actor, body) {
      if (actor.role !== "customer") throw new BookingError(403, "Only customers can book");
      const data = validateBooking(body);
      // Ownership comes from verified JWT, never a supplied customerId.
      return repository.book({ ...data, customerId: actor.userId.toLowerCase(),
        ...(actor.guest ? { customerName: actor.name, customerPhone: actor.phone } : {}) });
    },
    async transition(actor, id, action) {
      if (!isId(id)) throw new BookingError(400, "Invalid appointment id");
      const rule = ACTIONS[action];
      if (!rule) throw new BookingError(400, "Invalid appointment action");
      const appointment = await repository.findById(id.toLowerCase());
      if (!appointment) throw new BookingError(404, "Appointment not found");
      const owns = actor.userId.toLowerCase() === appointment[rule.owner];
      const recovered = rule.role === "customer" && actor.guest && actor.phoneVerified &&
        appointment.customerPhone === actor.phone;
      if (actor.role !== rule.role || (!owns && !recovered)) {
        throw new BookingError(403, "Appointment does not belong to this actor");
      }
      if (appointment.status !== rule.from) throw new BookingError(400, "Invalid appointment state");
      const updated = await repository.transition(id.toLowerCase(), action, {
        ...actor, userId: actor.userId.toLowerCase(),
        ...(recovered ? { authorizedPhone: actor.phone } : {}),
      });
      if (!updated) throw new BookingError(400, "Appointment state changed; reload and retry");
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
      if (actor.guest && actor.phoneVerified && !customerId && repository.listByPhone) {
        return repository.listByPhone(actor.phone);
      }
      return repository.listByCustomer ? repository.listByCustomer(targetId) : [];
    },
  };
}
module.exports = { createBookingService };
