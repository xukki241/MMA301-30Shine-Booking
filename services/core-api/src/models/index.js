const { createBranchModel } = require("./branch.model");
const { createServiceModel } = require("./service.model");
const { createStylistModel } = require("./stylist.model");
<<<<<<< HEAD
const { createCalendarModel } = require("./stylist-calendar");
=======
>>>>>>> origin/develop
const { createWorkShiftModel } = require("./work-shift.model");

function createModels(connection) {
  const Branch = createBranchModel(connection);
  const Service = createServiceModel(connection);
  const StylistProfile = createStylistModel(connection);
<<<<<<< HEAD
  const Calendar = createCalendarModel(connection);
  const WorkShift = createWorkShiftModel(connection);

  return { Branch, Service, StylistProfile, Calendar, WorkShift };
=======
  const WorkShift = createWorkShiftModel(connection);

  return { Branch, Service, StylistProfile, WorkShift };
>>>>>>> origin/develop
}

module.exports = {
  createBranchModel,
  createServiceModel,
  createStylistModel,
<<<<<<< HEAD
  createCalendarModel,
=======
>>>>>>> origin/develop
  createWorkShiftModel,
  createModels,
};
