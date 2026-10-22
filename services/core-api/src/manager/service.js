const { BookingError, isId } = require("../booking/rules");
const { dayRange, todayVietnam, parseAppointmentsQuery, parsePaymentsQuery, objectId } = require("./query");

function createManagerService(repository) {
  const onlyManager = (actor) => {
    if (actor.role !== "general_manager") throw new BookingError(403, "General Manager required");
  };
  return {
    async overview(actor, query) {
      onlyManager(actor);
      const date = query.date || todayVietnam();
      if (date !== "all") dayRange(date);
      return repository.managerOverview({ date, branchId: objectId(query.branchId, "branchId") });
    },
    async appointments(actor, query) {
      onlyManager(actor);
      return repository.managerAppointments(parseAppointmentsQuery(query));
    },
    async appointment(actor, id) {
      onlyManager(actor);
      if (!isId(id)) throw new BookingError(400, "Invalid appointment id");
      const appointment = await repository.managerAppointment(id.toLowerCase());
      if (!appointment) throw new BookingError(404, "Appointment not found");
      return appointment;
    },
    async restoreNoShow(actor, id) {
      onlyManager(actor);
      if (!isId(id)) throw new BookingError(400, "Invalid appointment id");
      const appointment = await repository.managerAppointment(id.toLowerCase());
      if (!appointment) throw new BookingError(404, "Appointment not found");
      if (appointment.status !== "no_show") throw new BookingError(400, "Invalid appointment state");
      const updated = await repository.restoreNoShow(id.toLowerCase(),
        { userId: actor.userId.toLowerCase(), role: actor.role });
      if (!updated) throw new BookingError(409, "Appointment changed or the time was booked again; reload and retry");
      return updated;
    },
    async payments(actor, query) {
      onlyManager(actor);
      return repository.managerPayments(parsePaymentsQuery(query));
    },
  };
}
module.exports = { createManagerService };
