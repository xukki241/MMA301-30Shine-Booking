function createServiceController({ Branch, Service }) {
  return {
    async createForBranch(req, res, next) {
      try {
        const { branchId } = req.params;
        const branch = await Branch.findById(branchId);
        if (!branch) {
          return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
        }

        const { name, price, durationMinutes, description, isActive } = req.body || {};
        if (!name || typeof name !== "string" || name.trim().length < 2) {
          return res.status(400).json({ error: "Tên dịch vụ là bắt buộc và phải có ít nhất 2 ký tự" });
        }
        if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
          return res.status(400).json({ error: "Giá dịch vụ phải là số không âm" });
        }
        if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
          return res.status(400).json({ error: "Thời lượng phải là số nguyên từ 5 đến 480 phút" });
        }

        const service = await Service.create({
          branchId,
          name: name.trim(),
          price,
          durationMinutes,
          description: typeof description === "string" ? description.trim() : "",
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        });

        return res.status(201).json({ service });
      } catch (error) {
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
        const services = await Service.find(query).sort({ createdAt: -1 });
        return res.json({ services });
      } catch (error) {
        return next(error);
      }
    },

    async getById(req, res, next) {
      try {
        const service = await Service.findById(req.params.id);
        if (!service) {
          return res.status(404).json({ error: "Không tìm thấy dịch vụ" });
        }
        return res.json({ service });
      } catch (error) {
        return next(error);
      }
    },

    async update(req, res, next) {
      try {
        const { name, price, durationMinutes, description, isActive } = req.body || {};
        const updateData = {};

        if (typeof name === "string") {
          if (name.trim().length < 2) {
            return res.status(400).json({ error: "Tên dịch vụ phải có ít nhất 2 ký tự" });
          }
          updateData.name = name.trim();
        }
        if (typeof price !== "undefined") {
          if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
            return res.status(400).json({ error: "Giá dịch vụ phải là số không âm" });
          }
          updateData.price = price;
        }
        if (typeof durationMinutes !== "undefined") {
          if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
            return res.status(400).json({ error: "Thời lượng phải là số nguyên từ 5 đến 480 phút" });
          }
          updateData.durationMinutes = durationMinutes;
        }
        if (typeof description === "string") {
          updateData.description = description.trim();
        }
        if (typeof isActive === "boolean") {
          updateData.isActive = isActive;
        }

        const service = await Service.findByIdAndUpdate(
          req.params.id,
          { $set: updateData },
          { returnDocument: "after", runValidators: true }
        );
        if (!service) {
          return res.status(404).json({ error: "Không tìm thấy dịch vụ" });
        }
        return res.json({ service });
      } catch (error) {
        if (error.name === "ValidationError") {
          return res.status(400).json({ error: error.message });
        }
        return next(error);
      }
    },

    async remove(req, res, next) {
      try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) {
          return res.status(404).json({ error: "Không tìm thấy dịch vụ" });
        }
        return res.json({ message: "Xóa dịch vụ thành công", id: req.params.id });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createServiceController };
