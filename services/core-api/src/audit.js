const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { Router } = require("express");

function createAuditModel(connection) {
  const schema = new mongoose.Schema({
    actorId: { type: String, default: null },
    action: { type: String, required: true, maxlength: 80 },
    targetType: { type: String, required: true, maxlength: 40 },
    targetId: { type: String, default: null },
    result: { type: String, enum: ["success", "failed"], required: true },
    occurredAt: { type: Date, default: Date.now, required: true },
  }, { versionKey: false, strict: "throw" });
  schema.index({ occurredAt: -1 });
  return connection.model("CoreAuditLog", schema, "audit_logs");
}

function createAuditRepository(AuditLog) {
  return {
    write: (entry) => AuditLog.create(entry),
    list: ({ action, result, from, to } = {}) => {
      const query = {};
      if (action) query.action = action;
      if (result) query.result = result;
      if (from || to) query.occurredAt = { ...(from ? { $gte: new Date(`${from}T00:00:00+07:00`) } : {}),
        ...(to ? { $lt: new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86_400_000) } : {}) };
      return AuditLog.find(query).sort({ occurredAt: -1 }).limit(100).lean().exec();
    },
  };
}

function auditAction(method, path) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "branches" && parts[2] === "services") return ["service", "create", parts[1]];
  if (parts[0] === "branches" && parts[2] === "stylists") return ["stylist", "assign", parts[1]];
  if (parts[0] === "branches") return ["branch", method === "POST" ? "create" : method === "PUT" ? "update" : "delete", parts[1]];
  if (parts[0] === "services") return ["service", method === "PUT" ? "update" : "delete", parts[1]];
  if (parts[0] === "stylists") return ["stylist", method === "PUT" ? "update" : "delete", parts[1]];
  if (parts[0] === "work-shifts") return ["shift", method === "POST" ? "create" : method === "PUT" ? "update" : "delete", parts[1]];
  if (parts[0] === "appointments") return ["appointment", parts[2] || "book", parts[1]];
  return null;
}

function auditMutations(audit) {
  return (req, res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const action = auditAction(req.method, req.path);
    if (!action) return next();
    const sendJson = res.json.bind(res);
    res.json = (body) => {
      const responseId = body?.branch?.id || body?.service?.id || body?.stylist?.id ||
        body?.workShift?.id || body?.appointment?.id;
      void Promise.resolve().then(() => audit.write({ actorId: req.auth?.userId || null,
        action: `${action[0]}.${action[1]}`, targetType: action[0],
        targetId: action[2] || responseId || null,
        result: res.statusCode < 400 ? "success" : "failed", occurredAt: new Date() }))
        .catch(() => console.error("Core audit write failed"))
        .finally(() => { try { sendJson(body); } catch { console.error("Core response send failed"); } });
      return res;
    };
    return next();
  };
}

function createInternalAuditRouter({ audit, secret }) {
  const router = Router();
  router.get("/audit", async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    if (!match) return res.status(401).json({ error: "Internal authentication required" });
    let claims;
    try { claims = jwt.verify(match[1], secret, { algorithms: ["HS256"], issuer: "auth-service" }); }
    catch { return res.status(401).json({ error: "Invalid internal token" }); }
    if (claims.scope !== "audit-read") return res.status(403).json({ error: "Invalid scope" });
    try {
      res.set("Cache-Control", "no-store");
      return res.json({ events: await audit.list(req.query) });
    } catch (error) { return next(error); }
  });
  return router;
}

module.exports = { createAuditModel, createAuditRepository, auditMutations, createInternalAuditRouter };
