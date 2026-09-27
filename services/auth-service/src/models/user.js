const mongoose = require("mongoose");

// Existing mobile naming is customer/stylist; shop_admin is the third backend role.
const ROLES = Object.freeze(["customer", "stylist", "shop_admin"]);

function createUserModel(connection, collection = "users") {
  const schema = new mongoose.Schema({
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: {
      type: String, required: true, select: false,
      match: /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/,
    },
    role: { type: String, required: true, enum: ROLES },
  }, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_doc, ret) => { delete ret.passwordHash; return ret; } },
  });
  schema.index({ email: 1 }, { unique: true });
  return connection.model("User", schema, collection);
}

function createUserRepository(User) {
  return {
    findByEmail: (email) => User.findOne({ email }).select("+passwordHash").exec(),
    create: (data) => User.create(data),
  };
}
module.exports = { ROLES, createUserModel, createUserRepository };
