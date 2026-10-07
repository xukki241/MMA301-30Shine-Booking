const { isValidObjectId } = require("../middleware/validation");

function createStylistController({ Branch, StylistProfile, WorkShift }) {
  return {
    async assignToBranch(req, res, next) {
      try {
        const { branchId } = req.params;
        const branch = await Branch.findById(branchId);
        if (!branch) {
          return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
        }

        const { userId, displayName, isActive } = req.body || {};
        if (!userId || !isValidObjectId(userId)) {
          return res.status(400).json({ error: "Mã tài khoản (userId) 24 ký tự hex hợp lệ là bắt buộc" });
        }
        if (!displayName || typeof displayName !== "string" || displayName.trim().length < 2) {
          return res.status(400).json({ error: "Tên hiển thị là bắt buộc và phải có ít nhất 2 ký tự" });
        }

        const existing = await StylistProfile.findOne({ userId, branchId });
        if (existing) {
          return res.status(409).json({ error: "Stylist đã được gán vào chi nhánh này" });
        }

        const stylist = await StylistProfile.create({
          userId,
          branchId,
          displayName: displayName.trim(),
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        });

        return res.status(201).json({ stylist });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({ error: "Stylist đã được gán vào chi nhánh này" });
        }
        if (error.name === "ValidationError") {
          return res.status(400).json({ error: error.message });
        }
        return next(error);
      }
    },

    async listByBranch(req, res, next) {
      try {
        const { branchId } = req.params;
        const branch = await Branch.findById(branchId);
        if (!branch) {
          return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
        }

        const query = { branchId };
        if (typeof req.query.isActive !== "undefined") {
          query.isActive = req.query.isActive === "true";
        }
        const stylists = await StylistProfile.find(query).sort({ createdAt: -1 });
        return res.json({ stylists });
      } catch (error) {
        return next(error);
      }
    },

    async getById(req, res, next) {
      try {
        const stylist = await StylistProfile.findById(req.params.id);
        if (!stylist) {
          return res.status(404).json({ error: "Không tìm thấy stylist" });
        }
        return res.json({ stylist });
      } catch (error) {
        return next(error);
      }
    },

    async update(req, res, next) {
      try {
        const { displayName, branchId, isActive } = req.body || {};
        const updateData = {};

        if (typeof displayName === "string") {
          if (displayName.trim().length < 2) {
            return res.status(400).json({ error: "Tên hiển thị phải có ít nhất 2 ký tự" });
          }
          updateData.displayName = displayName.trim();
        }

        if (typeof branchId !== "undefined") {
          if (!isValidObjectId(branchId)) {
            return res.status(400).json({ error: "Định dạng mã chi nhánh (branchId) không hợp lệ" });
          }
          const branch = await Branch.findById(branchId);
          if (!branch) {
            return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
          }
          const current = await StylistProfile.findById(req.params.id);
          if (!current) return res.status(404).json({ error: "Không tìm thấy stylist" });
          if (String(current.branchId) !== String(branchId) && WorkShift && await WorkShift.exists({ stylistId: current.userId })) {
            return res.status(409).json({ error: "Delete this stylist's Work Shifts before changing branch assignment" });
          }
          updateData.branchId = branchId;
        }

        if (typeof isActive === "boolean") {
          if (!isActive && WorkShift) {
            const current = await StylistProfile.findById(req.params.id);
            if (current && await WorkShift.exists({ stylistId: current.userId })) {
              return res.status(409).json({ error: "Delete this stylist's Work Shifts before deactivating the assignment" });
            }
          }
          updateData.isActive = isActive;
        }

        const stylist = await StylistProfile.findByIdAndUpdate(
          req.params.id,
          { $set: updateData },
          { returnDocument: "after", runValidators: true }
        );
        if (!stylist) {
          return res.status(404).json({ error: "Không tìm thấy stylist" });
        }
        return res.json({ stylist });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({ error: "Stylist đã được gán vào chi nhánh này" });
        }
        if (error.name === "ValidationError") {
          return res.status(400).json({ error: error.message });
        }
        return next(error);
      }
    },

    async remove(req, res, next) {
      try {
        if (WorkShift) {
          const current = await StylistProfile.findById(req.params.id);
          if (current && await WorkShift.exists({ stylistId: current.userId })) {
            return res.status(409).json({ error: "Delete this stylist's Work Shifts before removing the branch assignment" });
          }
        }
        const stylist = await StylistProfile.findByIdAndDelete(req.params.id);
        if (!stylist) {
          return res.status(404).json({ error: "Không tìm thấy stylist" });
        }
        return res.json({ message: "Hủy gán stylist thành công", id: req.params.id });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createStylistController };
