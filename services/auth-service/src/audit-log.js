const mongoose = require("mongoose");

function createAuditLogModel(connection) {
  const schema = new mongoose.Schema({
    actorId: { type: String, default: null },
    action: { type: String, required: true, maxlength: 80 },
    targetType: { type: String, required: true, maxlength: 40 },
    targetId: { type: String, default: null },
    result: { type: String, enum: ["success", "failed"], required: true },
    occurredAt: { type: Date, default: Date.now, required: true },
  }, { versionKey: false, strict: "throw" });
  schema.index({ occurredAt: -1 });
  return connection.model("AuditLog", schema, "audit_logs");
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

module.exports = { createAuditLogModel, createAuditRepository };
