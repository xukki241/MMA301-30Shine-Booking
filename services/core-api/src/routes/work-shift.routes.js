const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validateObjectIdParam } = require("../middleware/validation");
const { BookingError } = require("../booking/rules");

function createWorkShiftRouter({ repository, secret, verifyStaff, verifyCustomer, verifyActiveStylist }) {
  const router = express.Router();
  const admin = [authenticate(secret, verifyStaff, verifyCustomer), requireRole("general_manager")];
  const handle = (operation) => async (req, res, next) => {
    try { await operation(req, res); }
    catch (error) {
      if (error instanceof BookingError) return res.status(error.status).json({ error: error.message });
      return next(error);
    }
  };
  const activeStylist = async (req, res, next) => {
    if (!verifyActiveStylist) return res.status(503).json({ error: "Stylist verification unavailable" });
    try {
      if (!await verifyActiveStylist(req.body?.stylistId)) {
        return res.status(409).json({ error: "Active Stylist staff account required" });
      }
      return next();
    } catch { return res.status(503).json({ error: "Stylist verification unavailable" }); }
  };

  router.get("/", ...admin, handle(async (req, res) => res.json({ workShifts: await repository.list({ branchId: req.query.branchId, stylistId: req.query.stylistId, date: req.query.date }) })));
  router.post("/", ...admin, activeStylist, handle(async (req, res) => {
    const result = await repository.create(req.body || {});
    res.status(201).json({ workShift: result.shift });
  }));
  router.put("/:id", ...admin, validateObjectIdParam("id"), activeStylist, handle(async (req, res) => {
    const result = await repository.update(req.params.id, req.body || {});
    if (!result) return res.status(404).json({ error: "Work Shift not found" });
    res.json({ workShift: result.shift });
  }));
  router.delete("/:id", ...admin, validateObjectIdParam("id"), handle(async (req, res) => {
    const result = await repository.remove(req.params.id);
    if (!result) return res.status(404).json({ error: "Work Shift not found" });
    res.json({ message: "Work Shift deleted", id: result.id });
  }));
  return router;
}

function createTimeSlotRouter({ repository, secret, verifyStaff, verifyCustomer }) {
  const router = express.Router();
  router.get("/", authenticate(secret, verifyStaff, verifyCustomer), requireRole("customer", "general_manager"), async (req, res, next) => {
    try { res.json({ slots: await repository.availableSlots(req.query, req.auth) }); }
    catch (error) {
      if (error instanceof BookingError) return res.status(error.status).json({ error: error.message });
      return next(error);
    }
  });
  return router;
}

module.exports = { createWorkShiftRouter, createTimeSlotRouter };
