const { ACTIONS, BookingError, isId, validateBooking } = require("./rules");

function createBookingService(repository) {
  return {
    async book(actor, body) {
      if (actor.role !== "customer") throw new BookingError(403, "Only customers can book");
      const data = validateBooking(body);
      // Ownership comes from verified JWT, never a supplied customerId.
      return repository.book({ ...data, customerId: actor.userId.toLowerCase() });
    },
    async transition(actor, id, action) {
      if (!isId(id)) throw new BookingError(400, "Invalid appointment id");
      const rule = ACTIONS[action];
      if (!rule) throw new BookingError(400, "Invalid appointment action");
      const appointment = await repository.findById(id.toLowerCase());
      if (!appointment) throw new BookingError(404, "Appointment not found");
      if (actor.role !== rule.role || actor.userId.toLowerCase() !== appointment[rule.owner]) {
        throw new BookingError(403, "Appointment does not belong to this actor");
      }
      if (appointment.status !== rule.from) throw new BookingError(400, "Invalid appointment state");
      const updated = await repository.transition(id.toLowerCase(), action, {
        ...actor, userId: actor.userId.toLowerCase(),
      });
      if (!updated) throw new BookingError(400, "Appointment state changed; reload and retry");
      return updated;
    },
  };
}
module.exports = { createBookingService };
