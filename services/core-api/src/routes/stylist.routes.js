const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validateObjectIdParam } = require("../middleware/validation");

function createStylistRouter({ stylistController, secret }) {
  const router = express.Router();
  const requireAdmin = [authenticate(secret), requireRole("shop_admin")];

  router.get("/:id", validateObjectIdParam("id"), stylistController.getById);
  router.put("/:id", ...requireAdmin, validateObjectIdParam("id"), stylistController.update);
  router.delete("/:id", ...requireAdmin, validateObjectIdParam("id"), stylistController.remove);

  return router;
}

module.exports = { createStylistRouter };
