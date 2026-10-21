const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { randomInt, createHmac, timingSafeEqual } = require("node:crypto");
const { normalizePhone, normalizeName } = require("./customer-guest");
const { validateProfilePatch, publicProfile } = require("./customer-profile");

const pinValid = (value) => typeof value === "string" && /^\d{6}$/.test(value);
const digest = (secret, purpose, phone, code) => createHmac("sha256", secret).update(`${purpose}:${phone}:${code}`).digest("hex");
const bodyValid = (body, keys) => body && typeof body === "object" && !Array.isArray(body) &&
  Object.keys(body).every((key) => keys.includes(key));

function createCustomerModels(connection) {
  const homeAddressSchema = new mongoose.Schema({ province: String, district: String,
    ward: String, streetAddress: String }, { _id: false });
  const accountSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, match: /^\+84[35789]\d{8}$/ },
    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    email: { type: String, default: null },
    birthDate: { type: String, default: null },
    avatar: { type: String, default: null },
    homeAddress: { type: homeAddressSchema, default: null },
    passwordHash: { type: String, required: true, select: false },
    authVersion: { type: Number, required: true, default: 0 },
    loginAttempts: { type: Number, required: true, default: 0 },
    lastFailedAt: { type: Date, default: null },
  }, { timestamps: true, versionKey: false });
  const challengeSchema = new mongoose.Schema({
    phone: { type: String, required: true }, purpose: { type: String, required: true, enum: ["register", "reset"] },
    digest: { type: String, required: true }, expiresAt: { type: Date, required: true },
    sentAt: { type: Date, required: true }, attempts: { type: Number, required: true, default: 0 },
    verifiedAt: { type: Date, default: null },
  }, { versionKey: false });
  challengeSchema.index({ phone: 1, purpose: 1 }, { unique: true });
  challengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return {
    Account: connection.model("CustomerAccount", accountSchema, "customer_accounts"),
    Challenge: connection.model("CustomerChallenge", challengeSchema, "customer_challenges"),
  };
}

function createCustomerRepository({ Account, Challenge }) {
  return {
    findByPhone: (phone) => Account.findOne({ phone }).select("+passwordHash").exec(),
    findById: (id) => Account.findById(id).exec(),
    updateProfile: (id, fields) => Account.findByIdAndUpdate(id, { $set: fields },
      { returnDocument: "after", runValidators: true }).exec(),
    create: (data) => Account.create(data),
    updatePassword: (phone, passwordHash) => Account.findOneAndUpdate({ phone },
      { $set: { passwordHash, loginAttempts: 0, lastFailedAt: null }, $inc: { authVersion: 1 } }, { new: true }).exec(),
    async recordLoginFailure(phone) {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000);
      await Account.updateOne({ phone, lastFailedAt: { $lt: cutoff } }, { $set: { loginAttempts: 0 } }).exec();
      return Account.findOneAndUpdate({ phone }, { $inc: { loginAttempts: 1 }, $set: { lastFailedAt: new Date() } },
        { new: true }).exec();
    },
    clearLoginFailures: (phone) => Account.updateOne({ phone }, { $set: { loginAttempts: 0, lastFailedAt: null } }).exec(),
    getChallenge: (phone, purpose) => Challenge.findOne({ phone, purpose }).exec(),
    saveChallenge: (data) => Challenge.findOneAndUpdate({ phone: data.phone, purpose: data.purpose },
      { $set: data }, { upsert: true, new: true }).exec(),
    increaseAttempts: (phone, purpose) => Challenge.updateOne({ phone, purpose }, { $inc: { attempts: 1 } }).exec(),
    verifyChallenge: (phone, purpose, hash) => Challenge.findOneAndUpdate({ phone, purpose, digest: hash,
      expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { $set: { verifiedAt: new Date() } }, { new: true }).exec(),
    consumeChallenge: async (phone, purpose, hash) => Boolean(await Challenge.findOneAndDelete({ phone, purpose,
      digest: hash, verifiedAt: { $ne: null }, expiresAt: { $gt: new Date() } }).exec()),
  };
}

function installCustomerAccountRoutes(app, { customers, secret, expiresIn, otpEnabled = true, otpLogger = console.info }) {
  const issue = (account) => {
    const accessToken = jwt.sign({ role: "customer", authVersion: account.authVersion || 0 }, secret,
      { algorithm: "HS256", subject: String(account._id), expiresIn });
    return { accessToken, tokenType: "Bearer", expiresIn,
      user: { id: String(account._id), role: "customer", name: account.name, phone: account.phone } };
  };
  const unavailable = (_req, res, next) => customers ? next() : res.status(503).json({ error: "Customer accounts unavailable" });
  const profileAccount = async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    if (!match) return res.status(401).json({ error: "Invalid token" });
    try {
      const claims = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
      if (claims.role !== "customer" || claims.guest || !Number.isSafeInteger(claims.authVersion)) {
        return res.status(401).json({ error: "Invalid token" });
      }
      const account = await customers.findById(claims.sub);
      if (!account || account.authVersion !== claims.authVersion) return res.status(401).json({ error: "Invalid token" });
      req.customerAccount = account;
      return next();
    } catch (error) {
      if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)) {
        return res.status(401).json({ error: "Invalid token" });
      }
      return next(error);
    }
  };
  app.get("/auth/customer/profile", unavailable, profileAccount, (req, res) => {
    res.set("Cache-Control", "no-store");
    return res.json(publicProfile(req.customerAccount));
  });
  app.patch("/auth/customer/profile", unavailable, profileAccount, async (req, res, next) => {
    const fields = validateProfilePatch(req.body);
    if (!fields) return res.status(400).json({ error: "Invalid profile" });
    try {
      const account = await customers.updateProfile(String(req.customerAccount._id), fields);
      if (!account) return res.status(401).json({ error: "Invalid token" });
      res.set("Cache-Control", "no-store");
      return res.json(publicProfile(account));
    } catch (error) { return next(error); }
  });
  app.post("/auth/customer/lookup", unavailable, async (req, res, next) => {
    if (!bodyValid(req.body, ["phone"])) return res.status(400).json({ error: "Invalid phone" });
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: "Invalid phone" });
    try { return res.json({ exists: Boolean(await customers.findByPhone(phone)) }); }
    catch (error) { return next(error); }
  });
  for (const purpose of ["register", "reset"]) {
    app.post(`/auth/customer/${purpose}/request`, unavailable, async (req, res, next) => {
      if (!otpEnabled) return res.status(503).json({ error: "Demo OTP is disabled" });
      if (!bodyValid(req.body, ["phone"])) return res.status(400).json({ error: "Invalid phone" });
      const phone = normalizePhone(req.body.phone);
      if (!phone) return res.status(400).json({ error: "Invalid phone" });
      try {
        const account = await customers.findByPhone(phone);
        if (purpose === "register" && account) return res.status(409).json({ error: "Phone already registered" });
        if (purpose === "reset" && !account) return res.status(404).json({ error: "Customer not found" });
        const prior = await customers.getChallenge(phone, purpose);
        if (prior && Date.now() - new Date(prior.sentAt).getTime() < 60000) {
          return res.status(429).json({ error: "Please wait before requesting another code" });
        }
        const code = String(randomInt(0, 1000000)).padStart(6, "0");
        await customers.saveChallenge({ phone, purpose, digest: digest(secret, purpose, phone, code),
          expiresAt: new Date(Date.now() + 300000), sentAt: new Date(), attempts: 0, verifiedAt: null });
        otpLogger(`[DEMO OTP ${purpose}] ${phone}: ${code}`);
        return res.json({ message: "Demo code written to Auth Service console" });
      } catch (error) { return next(error); }
    });
    app.post(`/auth/customer/${purpose}/verify`, unavailable, async (req, res, next) => {
      if (!otpEnabled) return res.status(503).json({ error: "Demo OTP is disabled" });
      if (!bodyValid(req.body, ["phone", "code"])) return res.status(400).json({ error: "Invalid code" });
      const phone = normalizePhone(req.body.phone);
      if (!phone || !pinValid(req.body.code)) return res.status(400).json({ error: "Invalid code" });
      try {
        const challenge = await customers.getChallenge(phone, purpose);
        if (!challenge || challenge.attempts >= 5 || new Date(challenge.expiresAt) <= new Date()) {
          return res.status(401).json({ error: "Invalid or expired code" });
        }
        const expected = Buffer.from(challenge.digest, "hex");
        const actual = Buffer.from(digest(secret, purpose, phone, req.body.code), "hex");
        if (!timingSafeEqual(expected, actual)) {
          await customers.increaseAttempts(phone, purpose);
          return res.status(401).json({ error: "Invalid or expired code" });
        }
        const verified = await customers.verifyChallenge(phone, purpose, challenge.digest);
        return verified ? res.json({ verified: true }) : res.status(401).json({ error: "Invalid or expired code" });
      } catch (error) { return next(error); }
    });
  }
  app.post("/auth/customer/register/complete", unavailable, async (req, res, next) => {
    if (!bodyValid(req.body, ["phone", "code", "password", "name"])) return res.status(400).json({ error: "Invalid registration" });
    const phone = normalizePhone(req.body.phone), name = normalizeName(req.body.name);
    if (!phone || !name || !pinValid(req.body.code) || !pinValid(req.body.password)) return res.status(400).json({ error: "Invalid registration" });
    try {
      if (await customers.findByPhone(phone)) return res.status(409).json({ error: "Phone already registered" });
      const consumed = await customers.consumeChallenge(phone, "register", digest(secret, "register", phone, req.body.code));
      if (!consumed) return res.status(403).json({ error: "OTP verification required" });
      const account = await customers.create({ phone, name, passwordHash: await bcrypt.hash(req.body.password, 12) });
      res.set("Cache-Control", "no-store");
      return res.status(201).json(issue(account));
    } catch (error) { return error.code === 11000 ? res.status(409).json({ error: "Phone already registered" }) : next(error); }
  });
  app.post("/auth/customer/login", unavailable, async (req, res, next) => {
    if (!bodyValid(req.body, ["phone", "password"])) return res.status(400).json({ error: "Invalid credentials" });
    const phone = normalizePhone(req.body.phone);
    if (!phone || !pinValid(req.body.password)) return res.status(400).json({ error: "Invalid credentials" });
    try {
      const account = await customers.findByPhone(phone);
      if (account?.loginAttempts >= 5 && account.lastFailedAt &&
          Date.now() - new Date(account.lastFailedAt).getTime() < 15 * 60 * 1000) {
        return res.status(429).json({ error: "Too many login attempts" });
      }
      if (!account || !(await bcrypt.compare(req.body.password, account.passwordHash))) {
        if (account) await customers.recordLoginFailure(phone);
        return res.status(401).json({ error: "Invalid phone or password" });
      }
      await customers.clearLoginFailures(phone);
      res.set("Cache-Control", "no-store");
      return res.json(issue(account));
    } catch (error) { return next(error); }
  });
  app.post("/auth/customer/reset/complete", unavailable, async (req, res, next) => {
    if (!bodyValid(req.body, ["phone", "code", "password"])) return res.status(400).json({ error: "Invalid reset" });
    const phone = normalizePhone(req.body.phone);
    if (!phone || !pinValid(req.body.code) || !pinValid(req.body.password)) return res.status(400).json({ error: "Invalid reset" });
    try {
      const consumed = await customers.consumeChallenge(phone, "reset", digest(secret, "reset", phone, req.body.code));
      if (!consumed) return res.status(403).json({ error: "OTP verification required" });
      const account = await customers.updatePassword(phone, await bcrypt.hash(req.body.password, 12));
      if (!account) return res.status(404).json({ error: "Customer not found" });
      res.set("Cache-Control", "no-store");
      return res.json(issue(account));
    } catch (error) { return next(error); }
  });
  app.get("/auth/customer/introspect", unavailable, async (req, res) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    if (!match) return res.status(401).json({ error: "Invalid token" });
    try {
      const claims = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
      if (claims.role !== "customer" || claims.guest || !Number.isSafeInteger(claims.authVersion)) throw new Error("Invalid claims");
      const account = await customers.findById(claims.sub);
      if (!account || account.authVersion !== claims.authVersion) throw new Error("Revoked token");
      res.set("Cache-Control", "no-store");
      return res.json({ user: { id: String(account._id), role: "customer", name: account.name, phone: account.phone } });
    } catch { return res.status(401).json({ error: "Invalid token" }); }
  });
}

module.exports = { createCustomerModels, createCustomerRepository, installCustomerAccountRoutes };
