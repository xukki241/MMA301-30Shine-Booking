const mongoose = require("mongoose");

function createBranchModel(connection, collection = "branches") {
  const schema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: [true, "Tên chi nhánh là bắt buộc"],
        trim: true,
        minlength: [2, "Tên chi nhánh phải có ít nhất 2 ký tự"],
        maxlength: [100, "Tên chi nhánh không được vượt quá 100 ký tự"],
      },
      address: {
        type: String,
        required: [true, "Địa chỉ là bắt buộc"],
        trim: true,
        minlength: [5, "Địa chỉ phải có ít nhất 5 ký tự"],
        maxlength: [255, "Địa chỉ không được vượt quá 255 ký tự"],
      },
      phone: {
        type: String,
        trim: true,
        default: "",
        maxlength: [20, "Số điện thoại không được vượt quá 20 ký tự"],
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
          delete ret._id;
          return ret;
        },
      },
    }
  );

  return connection.model("Branch", schema, collection);
}

module.exports = { createBranchModel };
