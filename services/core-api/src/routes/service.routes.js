const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validateObjectIdParam } = require("../middleware/validation");

function createServiceRouter({ serviceController, secret, verifyStaff }) {
  const router = express.Router();
  const requireAdmin = [authenticate(secret, verifyStaff), requireRole("general_manager")];
  const canBrowse = [authenticate(secret, verifyStaff), requireRole("customer", "general_manager")];

  router.get("/:id", ...canBrowse, validateObjectIdParam("id"), serviceController.getById);
  router.put("/:id", ...requireAdmin, validateObjectIdParam("id"), serviceController.update);
  router.delete("/:id", ...requireAdmin, validateObjectIdParam("id"), serviceController.remove);

  return router;
}

module.exports = { createServiceRouter };
