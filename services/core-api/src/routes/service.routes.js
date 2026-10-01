const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validateObjectIdParam } = require("../middleware/validation");

function createServiceRouter({ serviceController, secret }) {
  const router = express.Router();
  const requireAdmin = [authenticate(secret), requireRole("shop_admin")];

  router.get("/:id", validateObjectIdParam("id"), serviceController.getById);
  router.put("/:id", ...requireAdmin, validateObjectIdParam("id"), serviceController.update);
  router.delete("/:id", ...requireAdmin, validateObjectIdParam("id"), serviceController.remove);

  return router;
}

module.exports = { createServiceRouter };
