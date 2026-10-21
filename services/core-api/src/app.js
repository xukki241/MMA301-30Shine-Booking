const express = require("express");
const cors = require("cors");
const { authenticate, createStaffVerifier, createCustomerVerifier, createActiveStylistVerifier } = require("./middleware/auth");
const { createModels } = require("./models");
const { createBranchController } = require("./controllers/branch.controller");
const { createServiceController } = require("./controllers/service.controller");
const { createStylistController } = require("./controllers/stylist.controller");
const { createBranchRouter } = require("./routes/branch.routes");
const { createServiceRouter } = require("./routes/service.routes");
const { createStylistRouter } = require("./routes/stylist.routes");
const { bookingRoutes } = require("./booking/routes");
const { createBookingRepository } = require("./booking/mongo-repository");
const { managerRoutes } = require("./manager/routes");
const { createWorkShiftRepository } = require("./work-shifts/repository");
const { createWorkShiftRouter, createTimeSlotRouter } = require("./routes/work-shift.routes");
const { createDocsRouter } = require("./docs/routes");
const { createInternalStylistRouter } = require("./routes/internal-stylist.routes");
const { createAuditRepository, auditMutations, createInternalAuditRouter } = require("./audit");


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
  const verifyStaff = opts.verifyStaff || createStaffVerifier(opts.authServiceUrl);
  const verifyCustomer = opts.verifyCustomer || createCustomerVerifier(opts.authServiceUrl);
  const verifyActiveStylist = opts.verifyActiveStylist || createActiveStylistVerifier(opts.authServiceUrl, secret);
  let bookingRepository = opts.bookingRepository;
  let workShiftRepository = opts.workShiftRepository;

  let models = opts.models;
  if (!models && opts.connection) {
    models = createModels(opts.connection);
  }
  if (models?.Calendar && !bookingRepository) bookingRepository = createBookingRepository(models.Calendar);
  if (models?.WorkShift && !workShiftRepository && models.Calendar) workShiftRepository = createWorkShiftRepository(models);
  const audit = opts.audit || (models?.AuditLog ? createAuditRepository(models.AuditLog) : null);

  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "512kb" }));
  if (audit) {
    app.use(auditMutations(audit));
    app.use("/internal", createInternalAuditRouter({ audit, secret }));
  }

  app.get("/health", (_req, res) => {
    const databaseOk = Boolean(models?.Branch?.db?.readyState === 1);
    res.json({ ok: true, service: "core-api", database: { ok: databaseOk } });
  });
  if (models?.Calendar && models?.WorkShift) {
    app.use("/internal", createInternalStylistRouter({ models, secret }));
  }

  // Scalar API Reference documentation (/docs & /openapi.json)
  app.use(createDocsRouter());

  // Minimal protected endpoint proving Auth Service -> Core API JWT verification
  app.get("/auth/me", authenticate(secret, verifyStaff, verifyCustomer), (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ user: req.auth });
  });

  if (models?.Branch) {
    app.get("/public/branches", async (_req, res, next) => {
      try {
        const branches = await models.Branch.find({ isActive: true });
        return res.json({ branches: branches.map((branch) => ({ id: String(branch._id), name: branch.name, address: branch.address })) });
      } catch (error) { return next(error); }
    });
    if (models.Service) app.get("/public/branches/:id/services", async (req, res, next) => {
      try {
        if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid branch id" });
        const branch = await models.Branch.findById(req.params.id);
        if (!branch || !branch.isActive) return res.status(404).json({ error: "Branch not found" });
        const services = await models.Service.find({ branchId: req.params.id, isActive: true });
        return res.json({ services: services.map((service) => ({ id: String(service._id), name: service.name,
          price: service.price, durationMinutes: service.durationMinutes, description: service.description })) });
      } catch (error) { return next(error); }
    });
  }

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
      stylistController = createStylistController(models, verifyActiveStylist);
    }
  }

  if (branchController) {
    app.use(
      "/branches",
      createBranchRouter({ branchController, serviceController, stylistController, secret, verifyStaff, verifyCustomer })
    );
  }
  if (serviceController) {
    app.use("/services", createServiceRouter({ serviceController, secret, verifyStaff, verifyCustomer }));
  }
  if (stylistController) {
    app.use("/stylists", createStylistRouter({ stylistController, secret, verifyStaff, verifyCustomer }));
  }

  // Booking routes (SHINE-03 / develop)
  app.use("/appointments", authenticate(secret, verifyStaff, verifyCustomer), bookingRoutes(bookingRepository, workShiftRepository));
  app.use("/manager", authenticate(secret, verifyStaff, verifyCustomer), managerRoutes(bookingRepository));
  if (workShiftRepository) {
    app.use("/work-shifts", createWorkShiftRouter({ repository: workShiftRepository, secret, verifyStaff, verifyCustomer, verifyActiveStylist }));
    app.use("/time-slots", createTimeSlotRouter({ repository: workShiftRepository, secret, verifyStaff, verifyCustomer }));
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
