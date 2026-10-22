const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { ROLES } = require("./models/user");

function publicStaff(user) {
  return { id: String(user._id), email: user.email, fullName: user.fullName || null,
    phone: user.phone || null, role: user.role,
    status: user.status || "active", createdAt: user.createdAt, updatedAt: user.updatedAt };
}

function validNewUser(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some((key) => !["email", "password", "role", "fullName", "phone"].includes(key))) return null;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      fullName.length < 2 || fullName.length > 100 ||
      (phone !== null && phone.length > 0 && !/^\+?[0-9\s\-().]{8,20}$/.test(phone)) ||
      typeof body.password !== "string" || body.password.length < 8 ||
      Buffer.byteLength(body.password, "utf8") > 72 || !ROLES.includes(body.role)) return null;
  return { email, fullName, phone: phone || null, password: body.password, role: body.role };
}

function createCoreHealthProbe(coreApiUrl) {
  const base = coreApiUrl.replace(/\/$/, "");
  return async () => {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { ok: false, database: { ok: false } };
    return response.json();
  };
}

function createCoreAuditProbe(coreApiUrl, secret) {
  const base = coreApiUrl.replace(/\/$/, "");
  return async (filters) => {
    const token = jwt.sign({ scope: "audit-read" }, secret,
      { algorithm: "HS256", issuer: "auth-service", expiresIn: 30 });
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const response = await fetch(`${base}/internal/audit?${query}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error("Core audit unavailable");
    const data = await response.json();
    if (!Array.isArray(data.events)) throw new Error("Invalid Core audit response");
    return data.events;
  };
}

function installStaffAdminRoutes(app, { users, secret, staffChangeGuard, coreHealthProbe, coreAuditProbe, audit }) {
  const recordAudit = async (entry) => {
    if (!audit) return;
    try { await audit.write(entry); }
    catch { console.error("Auth audit write failed"); }
  };
  // Serialize removals within this Auth process so two concurrent requests cannot both
  // pass the last-admin count check before either writes.
  let adminRemovalTail = Promise.resolve();
  const serializeAdminRemoval = (operation) => {
    const pending = adminRemovalTail.then(operation);
    adminRemovalTail = pending.catch(() => {});
    return pending;
  };
  const currentStaff = async (req, res, next) => {
    try {
      const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
      if (!match) return res.status(401).json({ error: "Authentication required" });
      const claims = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
      if (!claims || !/^[a-f0-9]{24}$/i.test(claims.sub || "") || !ROLES.includes(claims.role)) {
        return res.status(401).json({ error: "Invalid staff session" });
      }
      const user = await users.findById(claims.sub);
      if (!user || user.status === "locked" || user.role !== claims.role ||
          (user.authVersion || 0) !== claims.authVersion) {
        return res.status(401).json({ error: "Staff session no longer valid" });
      }
      req.staff = user;
      return next();
    } catch (error) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError" || error.name === "NotBeforeError") {
        return res.status(401).json({ error: "Invalid staff session" });
      }
      return next(error);
    }
  };
  const onlyAdmin = (req, res, next) => req.staff.role === "system_admin" ? next() :
    res.status(403).json({ error: "System Admin required" });

  app.get("/auth/introspect", currentStaff, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ user: publicStaff(req.staff) });
  });
  app.get("/admin/health", currentStaff, onlyAdmin, async (_req, res) => {
    let core;
    try { core = coreHealthProbe ? await coreHealthProbe() : { ok: false }; }
    catch { core = { ok: false }; }
    const authDatabaseOk = users.databaseHealth ? await users.databaseHealth() : false;
    const services = { auth: { ok: true }, core: { ok: Boolean(core.ok) },
      authDatabase: { ok: Boolean(authDatabaseOk) }, coreDatabase: { ok: Boolean(core.database?.ok) } };
    res.set("Cache-Control", "no-store");
    res.json({ checkedAt: new Date().toISOString(), ok: Object.values(services).every((item) => item.ok), services });
  });
  app.get("/admin/audit", currentStaff, onlyAdmin, async (req, res, next) => {
    if (!audit) return res.status(503).json({ error: "Audit log unavailable" });
    const { action, result, from, to } = req.query;
    const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if ((result && !["success", "failed"].includes(result)) ||
        (action && (typeof action !== "string" || action.length > 80)) ||
        (from && !validDate(from)) || (to && !validDate(to)) ||
        (from && to && from > to)) {
      return res.status(400).json({ error: "Invalid audit filter" });
    }
    try {
      res.set("Cache-Control", "no-store");
      const filters = { action, result, from, to };
      const [authEvents, coreEvents] = await Promise.all([
        audit.list(filters), coreAuditProbe ? coreAuditProbe(filters) : Promise.reject(new Error("Core audit unavailable")),
      ]);
      const events = [...authEvents, ...coreEvents]
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 100);
      return res.json({ events });
    } catch { return res.status(503).json({ error: "Audit log unavailable" }); }
  });
  app.get("/admin/users", currentStaff, onlyAdmin, async (_req, res, next) => {
    try { res.json({ users: (await users.list()).map(publicStaff) }); }
    catch (error) { next(error); }
  });
  app.post("/admin/users", currentStaff, onlyAdmin, async (req, res, next) => {
    const data = validNewUser(req.body);
    if (!data) return res.status(400).json({ error: "Invalid staff details" });
    try {
      if (await users.findByEmail(data.email)) return res.status(409).json({ error: "Email already registered" });
      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = await users.create({ email: data.email, fullName: data.fullName, phone: data.phone, passwordHash, role: data.role });
      await recordAudit({ actorId: String(req.staff._id), action: "staff.create",
        targetType: "staff", targetId: String(user._id), result: "success" });
      return res.status(201).json({ user: publicStaff(user) });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: "Email already registered" });
      return next(error);
    }
  });
  const loadTarget = async (req, res, next) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
    try {
      const target = await users.findById(req.params.id);
      if (!target || !ROLES.includes(target.role)) return res.status(404).json({ error: "Staff user not found" });
      req.targetStaff = target;
      return next();
    } catch (error) { return next(error); }
  };
  app.get("/admin/users/:id", currentStaff, onlyAdmin, loadTarget, (req, res) => {
    res.json({ user: publicStaff(req.targetStaff) });
  });
  const allowChange = async (req, res, next) => {
    const target = req.targetStaff;
    try {
      if (target.role === "stylist" && (req.change?.role && req.change.role !== "stylist" ||
          req.change?.status === "locked")) {
        if (!staffChangeGuard) return res.status(503).json({ error: "Stylist schedule check unavailable" });
        let clear;
        try { clear = await staffChangeGuard(String(target._id)); }
        catch { return res.status(503).json({ error: "Stylist schedule check unavailable" }); }
        if (!clear) {
          await recordAudit({ actorId: String(req.staff._id), action: req.auditAction || "staff.update",
            targetType: "staff", targetId: String(target._id), result: "failed" });
          return res.status(409).json({ error: "Stylist has future shifts or open appointments" });
        }
      }
      return next();
    } catch (error) { return next(error); }
  };
  const saveChange = async (req, res, next) => {
    try {
      const removingAdmin = req.targetStaff.role === "system_admin" && req.targetStaff.status !== "locked" &&
        (req.change.role && req.change.role !== "system_admin" || req.change.status === "locked");
      const update = async () => {
        if (removingAdmin && await users.countActiveAdmins() <= 1) return null;
        return users.updateById(req.params.id, req.change);
      };
      const user = removingAdmin ? await (users.withAdminRemovalLock || serializeAdminRemoval)(update) : await update();
      if (removingAdmin && !user) {
        await recordAudit({ actorId: String(req.staff._id), action: req.auditAction || "staff.update",
          targetType: "staff", targetId: req.params.id, result: "failed" });
        return res.status(409).json({ error: "Cannot remove the last active System Admin" });
      }
      if (!user) return res.status(404).json({ error: "Staff user not found" });
      await recordAudit({ actorId: String(req.staff._id), action: req.auditAction || "staff.update",
        targetType: "staff", targetId: String(user._id), result: "success" });
      return res.json({ user: publicStaff(user) });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: "Email already registered" });
      return next(error);
    }
  };
  app.patch("/admin/users/:id", currentStaff, onlyAdmin, loadTarget, async (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body) || !Object.keys(body).length ||
        Object.keys(body).some((key) => !["email", "password", "role", "fullName", "phone"].includes(key))) {
      return res.status(400).json({ error: "Invalid staff update" });
    }
    const change = {};
    if (body.fullName !== undefined) {
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
      if (fullName.length < 2 || fullName.length > 100) return res.status(400).json({ error: "Invalid full name" });
      change.fullName = fullName;
    }
    if (body.phone !== undefined) {
      const phone = typeof body.phone === "string" ? body.phone.trim() : null;
      if (phone !== null && phone.length > 0 && !/^\+?[0-9\s\-().]{8,20}$/.test(phone)) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
      change.phone = phone || null;
    }
    if (body.email !== undefined) {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email" });
      }
      change.email = email;
    }
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return res.status(400).json({ error: "Invalid role" });
      change.role = body.role;
    }
    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < 8 ||
          Buffer.byteLength(body.password, "utf8") > 72) return res.status(400).json({ error: "Invalid password" });
      change.passwordHash = await bcrypt.hash(body.password, 12);
    }
    req.change = change;
    req.auditAction = change.role && change.role !== req.targetStaff.role ? "staff.role_change" : "staff.update";
    return next();
  }, allowChange, saveChange);
  for (const status of ["locked", "active"]) {
    const action = status === "locked" ? "lock" : "restore";
    app.post(`/admin/users/:id/${action}`, currentStaff, onlyAdmin, loadTarget, (req, _res, next) => {
      req.change = { status };
      req.auditAction = `staff.${action}`;
      next();
    }, allowChange, saveChange);
  }
}

module.exports = { installStaffAdminRoutes, createCoreHealthProbe, createCoreAuditProbe, publicStaff, validNewUser };
