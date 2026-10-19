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
      dayRange(date);
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
    async payments(actor, query) {
      onlyManager(actor);
      return repository.managerPayments(parsePaymentsQuery(query));
    },
  };
}
module.exports = { createManagerService };
