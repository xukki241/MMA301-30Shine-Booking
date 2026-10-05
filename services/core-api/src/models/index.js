const { createBranchModel } = require("./branch.model");
const { createServiceModel } = require("./service.model");
const { createStylistModel } = require("./stylist.model");
const { createWorkShiftModel } = require("./work-shift.model");

function createModels(connection) {
  const Branch = createBranchModel(connection);
  const Service = createServiceModel(connection);
  const StylistProfile = createStylistModel(connection);
  const WorkShift = createWorkShiftModel(connection);

  return { Branch, Service, StylistProfile, WorkShift };
}

module.exports = {
  createBranchModel,
  createServiceModel,
  createStylistModel,
  createWorkShiftModel,
  createModels,
};
