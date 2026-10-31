const { Router } = require("express");
const { requireRole } = require("../middleware/role");
const { BookingError } = require("../booking/rules");
const { createManagerService } = require("./service");

function managerRoutes(repository) {
  const router = Router();
  const service = repository ? createManagerService(repository) : null;
  router.use(requireRole("general_manager"));
  router.use((_req, res, next) => service ? next() : res.status(503).json({ error: "Booking MongoDB is not configured" }));
  const handle = (operation) => async (req, res, next) => {
    try { res.json(await operation(req)); }
    catch (error) {
      if (error instanceof BookingError) return res.status(error.status).json({ error: error.message });
      return next(error);
    }
  };
  router.get("/overview", handle((req) => service.overview(req.auth, req.query)));
  router.get("/appointments", handle((req) => service.appointments(req.auth, req.query)));
  router.get("/appointments/:id", handle((req) => service.appointment(req.auth, req.params.id)));
  router.post("/appointments/:id/restore-no-show", handle((req) => service.restoreNoShow(req.auth, req.params.id)));
  router.get("/payments", handle((req) => service.payments(req.auth, req.query)));
  return router;
}
module.exports = { managerRoutes };
