const mongoose = require("mongoose");

function createStylistModel(connection, collection = "stylist_profiles") {
  const schema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Mã tài khoản (userId) là bắt buộc"],
        index: true,
      },
      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: [true, "Mã chi nhánh là bắt buộc"],
        index: true,
      },
      displayName: {
        type: String,
        required: [true, "Tên hiển thị là bắt buộc"],
        trim: true,
        minlength: [2, "Tên hiển thị phải có ít nhất 2 ký tự"],
        maxlength: [100, "Tên hiển thị không được vượt quá 100 ký tự"],
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      toJSON: {
        transform: (_doc, ret) => {
          ret.id = String(ret._id);
          ret.userId = String(ret.userId);
          ret.branchId = String(ret.branchId);
          delete ret._id;
          return ret;
        },
      },
    }
  );

  schema.index({ userId: 1, branchId: 1 }, { unique: true });

  return connection.model("StylistProfile", schema, collection);
}

module.exports = { createStylistModel };
