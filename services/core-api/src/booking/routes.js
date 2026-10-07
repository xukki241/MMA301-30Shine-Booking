const { Router } = require("express");
const { BookingError, validateBooking } = require("./rules");
const { createBookingService } = require("./service");

function bookingRoutes(repository, workShiftRepository) {
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
  router.get("/", handle(async (req, res) => {
    if (req.auth.role !== "stylist") throw new BookingError(403, "Only stylists can list appointments");
    const today = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const date = String(req.query.date || today());
    const appointments = await service.listStylistAppointments(req.auth, date);
    res.json({ appointments });
  }));
  router.post("/", handle(async (req, res) => {
    if (req.auth.role !== "customer") throw new BookingError(403, "Only customers can book");
    if (workShiftRepository) await workShiftRepository.validateBooking(validateBooking(req.body || {}));
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
