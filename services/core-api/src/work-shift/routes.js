const { Router } = require("express");
const { WorkShiftError } = require("./rules");

/**
 * Create Express router for /work-shifts and /time-slots endpoints.
 *
 * @param {object} opts
 * @param {object} opts.workShiftService - WorkShift service instance.
 * @param {Function} opts.authenticate - Auth middleware factory (called with secret).
 * @param {string} opts.secret - JWT secret.
 */
function createWorkShiftRouter({ workShiftService, authenticate, secret }) {
  const router = Router();

  const auth = authenticate(secret);

  /**
   * Wrap async handlers: translates WorkShiftError to HTTP response,
   * forwards unexpected errors to Express error handler.
   */
  const handle = (operation) => async (req, res, next) => {
    try {
      await operation(req, res);
    } catch (error) {
      if (error instanceof WorkShiftError) {
        return res.status(error.status).json({ error: error.message });
      }
      return next(error);
    }
  };

  // POST /work-shifts — Shop Admin creates a work shift.
  router.post(
    "/",
    auth,
    handle(async (req, res) => {
      const shift = await workShiftService.create(req.auth, req.body);
      return res.status(201).json({ shift });
    })
  );

  // GET /work-shifts?stylistId=&date= — Shop Admin lists work shifts.
  router.get(
    "/",
    auth,
    handle(async (req, res) => {
      const shifts = await workShiftService.list(req.auth, req.query);
      return res.json({ shifts });
    })
  );

  // DELETE /work-shifts/:id — Shop Admin deletes a work shift.
  router.delete(
    "/:id",
    auth,
    handle(async (req, res) => {
      const shift = await workShiftService.remove(req.auth, req.params.id);
      return res.json({ shift });
    })
  );

  return router;
}

/**
 * Create Express router for GET /time-slots endpoint.
 * Mounted separately from /work-shifts so any authenticated user can reach it.
 */
function createTimeSlotsRouter({ workShiftService, authenticate, secret }) {
  const router = Router();
  const auth = authenticate(secret);

  const handle = (operation) => async (req, res, next) => {
    try {
      await operation(req, res);
    } catch (error) {
      if (error instanceof WorkShiftError) {
        return res.status(error.status).json({ error: error.message });
      }
      return next(error);
    }
  };

  // GET /time-slots?stylistId=&date=&serviceId=
  router.get(
    "/",
    auth,
    handle(async (req, res) => {
      const slots = await workShiftService.listTimeSlots(req.auth, req.query);
      return res.json({ slots });
    })
  );

  return router;
}

module.exports = { createWorkShiftRouter, createTimeSlotsRouter };
