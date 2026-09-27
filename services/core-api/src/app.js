const express = require("express");
const cors = require("cors");
const { authenticate } = require("./middleware/auth");

function createApp(secret) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (_req, res) => res.json({ ok: true, service: "core-api" }));
  // Minimal protected endpoint proving Auth Service -> Core API JWT verification.
  app.get("/auth/me", authenticate(secret), (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ user: req.auth });
  });
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: "Invalid request" });
    return res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
module.exports = { createApp };
