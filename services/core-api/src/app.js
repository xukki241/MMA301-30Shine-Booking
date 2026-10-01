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

function createApp(options) {
  const opts = typeof options === "string" ? { secret: options } : options || {};
  const { secret } = opts;

  let models = opts.models;
  if (!models && opts.connection) {
    models = createModels(opts.connection);
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "core-api" }));

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

  // Central error handler with Vietnamese messages
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ" });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Dung lượng yêu cầu quá lớn" });
    if (err.name === "CastError") return res.status(400).json({ error: "Định dạng ID không hợp lệ" });
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: "Yêu cầu không hợp lệ" });
    return res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  });

  return app;
}

module.exports = { createApp };
