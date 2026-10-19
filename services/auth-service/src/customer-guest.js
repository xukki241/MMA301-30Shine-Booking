const { randomBytes, randomInt, createHash, createHmac, timingSafeEqual } = require("node:crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const hash = (value) => createHash("sha256").update(value).digest("hex");
const codeHash = (secret, phone, code) => createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");

function normalizePhone(value) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s.-]/g, "");
  if (/^0[35789]\d{8}$/.test(digits)) return `+84${digits.slice(1)}`;
  if (/^\+84[35789]\d{8}$/.test(digits)) return digits;
  return null;
}

function normalizeName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 100 ? name : null;
}

function createGuestModels(connection) {
  const guestSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 100 },
    phone: { type: String, required: true },
    deviceHash: { type: String, required: true, select: false },
    verifiedAt: { type: Date, default: null },
  }, { timestamps: true, versionKey: false });
  guestSchema.index({ deviceHash: 1 }, { unique: true });
  guestSchema.index({ phone: 1 });
  const recoverySchema = new mongoose.Schema({
    phone: { type: String, required: true },
    digest: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, required: true },
  }, { versionKey: false });
  recoverySchema.index({ phone: 1 }, { unique: true });
  recoverySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return {
    Guest: connection.model("CustomerGuest", guestSchema, "customer_guests"),
    Recovery: connection.model("CustomerRecovery", recoverySchema, "customer_recoveries"),
  };
}

function createGuestRepository({ Guest, Recovery }) {
  return {
    create: (data) => Guest.create(data),
    findByDeviceHash: (deviceHash) => Guest.findOne({ deviceHash }).select("+deviceHash").exec(),
    markVerified: (id) => Guest.findByIdAndUpdate(id, { verifiedAt: new Date() }, { new: true }).exec(),
    findRecovery: (phone) => Recovery.findOne({ phone }).exec(),
    saveRecovery: (data) => Recovery.findOneAndUpdate({ phone: data.phone }, data, { upsert: true, new: true }).exec(),
    increaseAttempts: (phone) => Recovery.updateOne({ phone }, { $inc: { attempts: 1 } }).exec(),
    consumeRecovery: (phone, digest) => Recovery.findOneAndDelete({ phone, digest, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }).exec(),
  };
}

function installCustomerGuestRoutes(app, { guests, secret, expiresIn, otpLogger = console.info, otpEnabled = true }) {
  const issue = (guest) => {
    const accessToken = jwt.sign({ role: "customer", guest: true, phone: guest.phone,
      name: guest.name, phoneVerified: Boolean(guest.verifiedAt) }, secret,
    { algorithm: "HS256", subject: String(guest._id), expiresIn });
    return { accessToken, tokenType: "Bearer", expiresIn,
      user: { id: String(guest._id), name: guest.name, phone: guest.phone,
        phoneVerified: Boolean(guest.verifiedAt), role: "customer" } };
  };
  const validBody = (body, keys) => body && typeof body === "object" && !Array.isArray(body) &&
    Object.keys(body).every((key) => keys.includes(key));
  const unavailable = (_req, res, next) => guests ? next() : res.status(503).json({ error: "Customer session is unavailable" });

  app.post("/auth/customer/start", unavailable, async (req, res, next) => {
    if (!validBody(req.body, ["name", "phone"])) return res.status(400).json({ error: "Invalid customer details" });
    const name = normalizeName(req.body.name);
    const phone = normalizePhone(req.body.phone);
    if (!name || !phone) return res.status(400).json({ error: "Invalid customer details" });
    try {
      const deviceSecret = randomBytes(32).toString("hex");
      const guest = await guests.create({ name, phone, deviceHash: hash(deviceSecret) });
      res.set("Cache-Control", "no-store");
      return res.status(201).json({ ...issue(guest), deviceSecret });
    } catch (error) { return next(error); }
  });

  app.post("/auth/customer/resume", unavailable, async (req, res, next) => {
    if (!validBody(req.body, ["deviceSecret"]) || !/^[a-f0-9]{64}$/i.test(req.body.deviceSecret || "")) {
      return res.status(400).json({ error: "Invalid device session" });
    }
    try {
      const guest = await guests.findByDeviceHash(hash(req.body.deviceSecret));
      if (!guest) return res.status(401).json({ error: "Device session not found" });
      res.set("Cache-Control", "no-store");
      return res.json(issue(guest));
    } catch (error) { return next(error); }
  });

  app.post("/auth/customer/recovery/request", unavailable, async (req, res, next) => {
    if (!otpEnabled) return res.status(503).json({ error: "Demo OTP is disabled" });
    if (!validBody(req.body, ["phone"])) return res.status(400).json({ error: "Invalid phone" });
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: "Invalid phone" });
    try {
      const existing = await guests.findRecovery(phone);
      if (existing && Date.now() - new Date(existing.sentAt).getTime() < 60000) {
        return res.status(429).json({ error: "Please wait before requesting another code" });
      }
      const code = String(randomInt(0, 1000000)).padStart(6, "0");
      await guests.saveRecovery({ phone, digest: codeHash(secret, phone, code),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), sentAt: new Date(), attempts: 0 });
      otpLogger(`[DEMO OTP] ${phone}: ${code}`);
      return res.json({ message: "Demo code written to Auth Service console" });
    } catch (error) { return next(error); }
  });

  app.post("/auth/customer/recovery/verify", unavailable, async (req, res, next) => {
    if (!otpEnabled) return res.status(503).json({ error: "Demo OTP is disabled" });
    if (!validBody(req.body, ["phone", "code", "deviceSecret"])) return res.status(400).json({ error: "Invalid recovery data" });
    const phone = normalizePhone(req.body.phone);
    if (!phone || !/^\d{6}$/.test(req.body.code || "") || !/^[a-f0-9]{64}$/i.test(req.body.deviceSecret || "")) {
      return res.status(400).json({ error: "Invalid recovery data" });
    }
    try {
      const guest = await guests.findByDeviceHash(hash(req.body.deviceSecret));
      if (!guest || guest.phone !== phone) return res.status(403).json({ error: "Device session does not match phone" });
      const recovery = await guests.findRecovery(phone);
      if (!recovery || recovery.attempts >= 5 || new Date(recovery.expiresAt).getTime() <= Date.now()) {
        return res.status(401).json({ error: "Invalid or expired code" });
      }
      const expected = Buffer.from(recovery.digest, "hex");
      const actual = Buffer.from(codeHash(secret, phone, req.body.code), "hex");
      if (!timingSafeEqual(expected, actual)) {
        await guests.increaseAttempts(phone);
        return res.status(401).json({ error: "Invalid or expired code" });
      }
      const consumed = await guests.consumeRecovery(phone, recovery.digest);
      if (!consumed) return res.status(401).json({ error: "Invalid or expired code" });
      const verified = await guests.markVerified(guest._id);
      res.set("Cache-Control", "no-store");
      return res.json(issue(verified));
    } catch (error) { return next(error); }
  });
}

module.exports = { normalizePhone, normalizeName, createGuestModels, createGuestRepository, installCustomerGuestRoutes };
