const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validateObjectIdParam } = require("../middleware/validation");

function createStylistRouter({ stylistController, secret, verifyStaff, verifyCustomer }) {
  const router = express.Router();
  const requireAdmin = [authenticate(secret, verifyStaff, verifyCustomer), requireRole("general_manager")];
  const canBrowse = [authenticate(secret, verifyStaff, verifyCustomer), requireRole("customer", "general_manager")];
  const self = [authenticate(secret, verifyStaff, verifyCustomer), requireRole("stylist")];

  router.get("/me", ...self, stylistController.getMe);
  router.get("/:id", ...canBrowse, validateObjectIdParam("id"), stylistController.getById);
  router.put("/:id", ...requireAdmin, validateObjectIdParam("id"), stylistController.update);
  router.delete("/:id", ...requireAdmin, validateObjectIdParam("id"), stylistController.remove);

  return router;
}

module.exports = { createStylistRouter };
