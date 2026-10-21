const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validateObjectIdParam } = require("../middleware/validation");

function createBranchRouter({
  branchController,
  serviceController,
  stylistController,
  secret,
  verifyStaff,
}) {
  const router = express.Router();
  const requireAdmin = [authenticate(secret, verifyStaff), requireRole("general_manager")];
  const canBrowse = [authenticate(secret, verifyStaff), requireRole("customer", "general_manager")];

  // Branch CRUD
  router.get("/", ...canBrowse, branchController.list);
  router.post("/", ...requireAdmin, branchController.create);
  router.get("/:id", ...canBrowse, validateObjectIdParam("id"), branchController.getById);
  router.put(
    "/:id",
    ...requireAdmin,
    validateObjectIdParam("id"),
    branchController.update,
  );
  router.delete(
    "/:id",
    ...requireAdmin,
    validateObjectIdParam("id"),
    branchController.remove,
  );

  // Nested Services under Branch
  if (serviceController) {
    router.get(
      "/:branchId/services",
      ...canBrowse,
      validateObjectIdParam("branchId"),
      serviceController.listByBranch,
    );
    router.post(
      "/:branchId/services",
      ...requireAdmin,
      validateObjectIdParam("branchId"),
      serviceController.createForBranch,
    );
  }

  // Nested Stylists under Branch
  if (stylistController) {
    router.get(
      "/:branchId/stylists",
      ...canBrowse,
      validateObjectIdParam("branchId"),
      stylistController.listByBranch,
    );
    router.post(
      "/:branchId/stylists",
      ...requireAdmin,
      validateObjectIdParam("branchId"),
      stylistController.assignToBranch,
    );
  }

  return router;
}

module.exports = { createBranchRouter };
