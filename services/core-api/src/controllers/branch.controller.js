function createBranchController({ Branch, Service, StylistProfile, WorkShift }) {
  return {
    async create(req, res, next) {
      try {
        const { name, address, phone, isActive } = req.body || {};
        if (!name || typeof name !== "string" || name.trim().length < 2) {
          return res.status(400).json({ error: "Tên chi nhánh là bắt buộc và phải có ít nhất 2 ký tự" });
        }
        if (!address || typeof address !== "string" || address.trim().length < 5) {
          return res.status(400).json({ error: "Địa chỉ là bắt buộc và phải có ít nhất 5 ký tự" });
        }
        const branchData = {
          name: name.trim(),
          address: address.trim(),
          phone: typeof phone === "string" ? phone.trim() : "",
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        };
        const branch = await Branch.create(branchData);
        return res.status(201).json({ branch });
      } catch (error) {
        if (error.name === "ValidationError") {
          return res.status(400).json({ error: error.message });
        }
        return next(error);
      }
    },

    async list(req, res, next) {
      try {
        const query = {};
        if (typeof req.query.isActive !== "undefined") {
          query.isActive = req.query.isActive === "true";
        }
        const branches = await Branch.find(query).sort({ createdAt: -1 });
        return res.json({ branches });
      } catch (error) {
        return next(error);
      }
    },

    async getById(req, res, next) {
      try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
          return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
        }
        return res.json({ branch });
      } catch (error) {
        return next(error);
      }
    },

    async update(req, res, next) {
      try {
        const { name, address, phone, isActive } = req.body || {};
        const updateData = {};
        if (typeof name === "string") {
          if (name.trim().length < 2) {
            return res.status(400).json({ error: "Tên chi nhánh phải có ít nhất 2 ký tự" });
          }
          updateData.name = name.trim();
        }
        if (typeof address === "string") {
          if (address.trim().length < 5) {
            return res.status(400).json({ error: "Địa chỉ phải có ít nhất 5 ký tự" });
          }
          updateData.address = address.trim();
        }
        if (typeof phone === "string") {
          updateData.phone = phone.trim();
        }
        if (typeof isActive === "boolean") {
          updateData.isActive = isActive;
        }

        const branch = await Branch.findByIdAndUpdate(
          req.params.id,
          { $set: updateData },
          { returnDocument: "after", runValidators: true }
        );
        if (!branch) {
          return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
        }
        return res.json({ branch });
      } catch (error) {
        if (error.name === "ValidationError") {
          return res.status(400).json({ error: error.message });
        }
        return next(error);
      }
    },

    async remove(req, res, next) {
      try {
        if (WorkShift && await WorkShift.exists({ branchId: req.params.id })) {
          return res.status(409).json({ error: "Delete Work Shifts for this branch before deleting the branch" });
        }
        const branch = await Branch.findByIdAndDelete(req.params.id);
        if (!branch) {
          return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
        }
        // Cleanup cascading services and stylist assignments if models provided
        if (Service) {
          await Service.deleteMany({ branchId: req.params.id });
        }
        if (StylistProfile) {
          await StylistProfile.deleteMany({ branchId: req.params.id });
        }
        return res.json({ message: "Xóa chi nhánh thành công", id: req.params.id });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createBranchController };
