const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validateObjectIdParam } = require("../middleware/validation");
const { BookingError } = require("../booking/rules");

function createWorkShiftRouter({ repository, secret }) {
  const router = express.Router();
  const admin = [authenticate(secret), requireRole("shop_admin")];
  const handle = (operation) => async (req, res, next) => {
    try { await operation(req, res); }
    catch (error) {
      if (error instanceof BookingError) return res.status(error.status).json({ error: error.message });
      return next(error);
    }
  };

  router.get("/", handle(async (req, res) => res.json({ workShifts: await repository.list({ branchId: req.query.branchId, stylistId: req.query.stylistId, date: req.query.date }) })));
  router.post("/", ...admin, handle(async (req, res) => {
    const result = await repository.create(req.body || {});
    res.status(201).json({ workShift: result.shift });
  }));
  router.put("/:id", ...admin, validateObjectIdParam("id"), handle(async (req, res) => {
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

function createTimeSlotRouter({ repository }) {
  const router = express.Router();
  router.get("/", async (req, res, next) => {
    try { res.json({ slots: await repository.availableSlots(req.query) }); }
    catch (error) {
      if (error instanceof BookingError) return res.status(error.status).json({ error: error.message });
      return next(error);
    }
  });
  return router;
}

module.exports = { createWorkShiftRouter, createTimeSlotRouter };
