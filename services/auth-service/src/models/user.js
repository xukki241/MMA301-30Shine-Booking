const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");

// Customer uses Guest Sessions. Registered users are personnel only.
const ROLES = Object.freeze(["stylist", "system_admin", "general_manager"]);

function createUserModel(connection, collection = "users") {
  const schema = new mongoose.Schema({
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: {
      type: String, required: true, select: false,
      match: /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/,
    },
    role: { type: String, required: true, enum: ROLES },
    status: { type: String, required: true, enum: ["active", "locked"], default: "active" },
    authVersion: { type: Number, required: true, default: 0, min: 0 },
  }, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_doc, ret) => { delete ret.passwordHash; return ret; } },
  });
  schema.index({ email: 1 }, { unique: true });
  return connection.model("User", schema, collection);
}

function createUserRepository(User) {
  async function withAdminRemovalLock(operation) {
    const locks = User.db.collection("staff_admin_locks");
    const owner = randomUUID();
    const deadline = Date.now() + 5000;
    let acquired = false;
    while (!acquired && Date.now() < deadline) {
      try {
        const now = new Date();
        const result = await locks.findOneAndUpdate(
          { _id: "last-active-admin", expiresAt: { $lt: now } },
          { $set: { owner, expiresAt: new Date(now.getTime() + 30_000) } },
          { upsert: true, returnDocument: "after" },
        );
        acquired = result?.owner === owner || result?.value?.owner === owner;
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
      if (!acquired) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (!acquired) throw new Error("Admin role change lock unavailable");
    try { return await operation(); }
    finally {
      try { await locks.deleteOne({ _id: "last-active-admin", owner }); }
      catch { console.error("Admin role change lock release failed"); }
    }
  }
  return {
    findByEmail: (email) => User.findOne({ email }).select("+passwordHash").exec(),
    findById: (id) => User.findById(id).exec(),
    list: () => User.find({ role: { $in: ROLES } }).sort({ createdAt: -1 }).exec(),
    create: (data) => User.create(data),
    updateById: (id, changes) => User.findByIdAndUpdate(id, {
      $set: changes, $inc: { authVersion: 1 },
    }, { new: true, runValidators: true }).exec(),
    countActiveAdmins: () => User.countDocuments({ role: "system_admin", status: "active" }).exec(),
    withAdminRemovalLock,
    databaseHealth: () => User.db.readyState === 1,
  };
}
module.exports = { ROLES, createUserModel, createUserRepository };
