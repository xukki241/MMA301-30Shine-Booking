const mongoose = require("mongoose");

function createServiceModel(connection, collection = "services") {
  const schema = new mongoose.Schema(
    {
      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: [true, "Mã chi nhánh là bắt buộc"],
        index: true,
      },
      name: {
        type: String,
        required: [true, "Tên dịch vụ là bắt buộc"],
        trim: true,
        minlength: [2, "Tên dịch vụ phải có ít nhất 2 ký tự"],
        maxlength: [100, "Tên dịch vụ không được vượt quá 100 ký tự"],
      },
      price: {
        type: Number,
        required: [true, "Giá dịch vụ là bắt buộc"],
        min: [0, "Giá dịch vụ không được âm"],
      },
      durationMinutes: {
        type: Number,
        required: [true, "Thời lượng thực hiện là bắt buộc"],
        min: [5, "Thời lượng tối thiểu là 5 phút"],
        max: [480, "Thời lượng tối đa là 480 phút"],
      },
      description: {
        type: String,
        trim: true,
        default: "",
        maxlength: [500, "Mô tả không được vượt quá 500 ký tự"],
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
          ret.branchId = String(ret.branchId);
          delete ret._id;
          return ret;
        },
      },
    }
  );

  return connection.model("Service", schema, collection);
}

module.exports = { createServiceModel };
