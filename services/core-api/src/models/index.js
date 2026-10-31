const { createBranchModel } = require("./branch.model");
const { createServiceModel } = require("./service.model");
const { createStylistModel } = require("./stylist.model");
const { createCalendarModel } = require("./stylist-calendar");
const { createWorkShiftModel } = require("./work-shift.model");
const { createAuditModel } = require("../audit");

function createModels(connection) {
  const Branch = createBranchModel(connection);
  const Service = createServiceModel(connection);
  const StylistProfile = createStylistModel(connection);
  const Calendar = createCalendarModel(connection);
  const WorkShift = createWorkShiftModel(connection);
  const AuditLog = createAuditModel(connection);

  return { Branch, Service, StylistProfile, Calendar, WorkShift, AuditLog };
}

module.exports = {
  createBranchModel,
  createServiceModel,
  createStylistModel,
  createCalendarModel,
  createWorkShiftModel,
  createModels,
};
