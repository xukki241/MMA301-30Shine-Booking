const { createBranchModel } = require("./branch.model");
const { createServiceModel } = require("./service.model");
const { createStylistModel } = require("./stylist.model");

function createModels(connection) {
  const Branch = createBranchModel(connection);
  const Service = createServiceModel(connection);
  const StylistProfile = createStylistModel(connection);

  return { Branch, Service, StylistProfile };
}

module.exports = {
  createBranchModel,
  createServiceModel,
  createStylistModel,
  createModels,
};
