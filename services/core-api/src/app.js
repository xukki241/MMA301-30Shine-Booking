const express = require("express");
const cors = require("cors");
const { authenticate } = require("./middleware/auth");
const { createModels } = require("./models");
const { createBranchController } = require("./controllers/branch.controller");
const { createServiceController } = require("./controllers/service.controller");
const { createStylistController } = require("./controllers/stylist.controller");
const { createBranchRouter } = require("./routes/branch.routes");
const { createServiceRouter } = require("./routes/service.routes");
const { createStylistRouter } = require("./routes/stylist.routes");
const { bookingRoutes } = require("./booking/routes");
const { createWorkShiftRepository } = require("./work-shift/mongo-repository");
const { createWorkShiftService } = require("./work-shift/service");
const { createWorkShiftRouter, createTimeSlotsRouter } = require("./work-shift/routes");
const { createDocsRouter } = require("./docs/routes");

function createApp(optionsOrSecret, extraBookingRepository) {
  let opts = {};
  if (typeof optionsOrSecret === "string") {
    opts = { secret: optionsOrSecret, bookingRepository: extraBookingRepository };
  } else if (optionsOrSecret && typeof optionsOrSecret === "object") {
    opts = { ...optionsOrSecret };
    if (extraBookingRepository) {
      opts.bookingRepository = extraBookingRepository;
    }
  }

  const { secret } = opts;
  const bookingRepository = opts.bookingRepository;

  let models = opts.models;
  if (!models && opts.connection) {
    models = createModels(opts.connection);
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "core-api" }));

  // Scalar API Reference documentation (/docs & /openapi.json)
  app.use(createDocsRouter());

  // Minimal protected endpoint proving Auth Service -> Core API JWT verification
  app.get("/auth/me", authenticate(secret), (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ user: req.auth });
  });

  // If models or controllers are supplied, mount catalog routes
  let branchController = opts.controllers?.branchController;
  let serviceController = opts.controllers?.serviceController;
  let stylistController = opts.controllers?.stylistController;

  if (models) {
    if (!branchController && models.Branch) {
      branchController = createBranchController(models);
    }
    if (!serviceController && models.Service) {
      serviceController = createServiceController(models);
    }
    if (!stylistController && models.StylistProfile) {
      stylistController = createStylistController(models);
    }
  }

  if (branchController) {
    app.use(
      "/branches",
      createBranchRouter({ branchController, serviceController, stylistController, secret })
    );
  }
  if (serviceController) {
    app.use("/services", createServiceRouter({ serviceController, secret }));
  }
  if (stylistController) {
    app.use("/stylists", createStylistRouter({ stylistController, secret }));
  }

  // Booking routes (SHINE-03 / develop)
  app.use("/appointments", authenticate(secret), bookingRoutes(bookingRepository));

  // Work Shift + Time Slots routes (SHINE-06)
  // Allow opts.workShiftRepository/serviceModel overrides for tests.
  let workShiftRepository = opts.workShiftRepository || null;
  let workShiftServiceModel = opts.workShiftServiceModel || (models && models.Service) || null;

  if (!workShiftRepository && models && models.WorkShift) {
    workShiftRepository = createWorkShiftRepository(models.WorkShift);
  }

  if (workShiftRepository && bookingRepository && workShiftServiceModel) {
    const workShiftService = createWorkShiftService(
      workShiftRepository,
      bookingRepository,
      workShiftServiceModel
    );
    app.use("/work-shifts", createWorkShiftRouter({ workShiftService, authenticate, secret }));
    app.use("/time-slots", createTimeSlotsRouter({ workShiftService, authenticate, secret }));
  }

  // Central error handler with Vietnamese messages
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ" });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Dung lượng yêu cầu quá lớn" });
    if (err.name === "CastError") return res.status(400).json({ error: "Định dạng ID không hợp lệ" });
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: "Yêu cầu không hợp lệ" });
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
