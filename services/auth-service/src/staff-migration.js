const bcrypt = require("bcryptjs");
const { ROLES } = require("./models/user");

async function migrateLegacyShopAdmins(User) {
  const result = await User.updateMany({ role: "shop_admin" }, {
    $set: { role: "system_admin" },
  }).exec();
  await User.updateMany({ role: { $in: ROLES }, status: { $exists: false } },
    { $set: { status: "active" } }).exec();
  await User.updateMany({ role: { $in: ROLES }, authVersion: { $exists: false } },
    { $set: { authVersion: 0 } }).exec();
  return result.modifiedCount;
}

async function bootstrapSystemAdmin(User, rawEmail, password) {
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Valid bootstrap email and password are required");
  }
  if (await User.countDocuments({ role: "system_admin" }).exec()) {
    throw new Error("System Admin already exists");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({ _id: "000000000000000000000001", email, passwordHash,
    role: "system_admin", status: "active", authVersion: 0 });
}

module.exports = { migrateLegacyShopAdmins, bootstrapSystemAdmin };
