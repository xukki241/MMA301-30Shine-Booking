const { Router } = require("express");
const { BookingError } = require("./rules");
const { createBookingService } = require("./service");

function bookingRoutes(repository) {
  const router = Router();
  const service = repository ? createBookingService(repository) : null;
  router.use((_req, res, next) => {
    if (!service) return res.status(503).json({ error: "Booking MongoDB is not configured" });
    return next();
  });
  const handle = (operation) => async (req, res, next) => {
    try { await operation(req, res); }
    catch (error) {
      if (error instanceof BookingError) return res.status(error.status).json({ error: error.message });
      return next(error);
    }
  };
  router.post("/", handle(async (req, res) => {
    const appointment = await service.book(req.auth, req.body);
    res.status(201).json({ appointment });
  }));
  for (const action of ["complete", "cancel", "pay"]) {
    router.post("/:id/" + action, handle(async (req, res) => {
      if (req.body && (Array.isArray(req.body) || typeof req.body !== "object" || Object.keys(req.body).length)) {
        throw new BookingError(400, "Action does not accept update fields");
      }
      const appointment = await service.transition(req.auth, req.params.id, action);
      res.json({ appointment });
    }));
  }
  return router;
}
module.exports = { bookingRoutes };
