const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validateObjectIdParam } = require("../middleware/validation");

function createBranchRouter({ branchController, serviceController, stylistController, secret }) {
  const router = express.Router();
  const requireAdmin = [authenticate(secret), requireRole("shop_admin")];

  // Branch CRUD
  router.get("/", branchController.list);
  router.post("/", ...requireAdmin, branchController.create);
  router.get("/:id", validateObjectIdParam("id"), branchController.getById);
  router.put("/:id", ...requireAdmin, validateObjectIdParam("id"), branchController.update);
  router.delete("/:id", ...requireAdmin, validateObjectIdParam("id"), branchController.remove);

  // Nested Services under Branch
  if (serviceController) {
    router.get("/:branchId/services", validateObjectIdParam("branchId"), serviceController.listByBranch);
    router.post("/:branchId/services", ...requireAdmin, validateObjectIdParam("branchId"), serviceController.createForBranch);
  }

  // Nested Stylists under Branch
  if (stylistController) {
    router.get("/:branchId/stylists", validateObjectIdParam("branchId"), stylistController.listByBranch);
    router.post("/:branchId/stylists", ...requireAdmin, validateObjectIdParam("branchId"), stylistController.assignToBranch);
  }

  return router;
}

module.exports = { createBranchRouter };
