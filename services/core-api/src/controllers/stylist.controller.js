const { isValidObjectId } = require("../middleware/validation");

function createStylistController({ Branch, StylistProfile, WorkShift }, _verifyActiveStylist, stylistDirectory) {
  const directory = async () => {
    if (!stylistDirectory) throw Object.assign(new Error("Stylist directory unavailable"), { status: 503 });
    try { return await stylistDirectory(); }
    catch { throw Object.assign(new Error("Stylist directory unavailable"), { status: 503 }); }
  };
  const currentName = (profile, staff) => staff.find((item) => item.id === String(profile.userId))?.fullName || profile.displayName;
  const publicProfile = (profile, staff) => ({ ...profile.toJSON(), displayName: currentName(profile, staff) });
  const primaryProfileIds = (profiles) => {
    const first = new Map();
    for (const profile of [...profiles].sort((a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt) || String(a._id).localeCompare(String(b._id)))) {
      const userId = String(profile.userId);
      if (!first.has(userId)) first.set(userId, String(profile._id));
    }
    return new Set(first.values());
  };
  return {
    async candidates(req, res, next) {
      try {
        const branchId = req.query.branchId;
        if (!isValidObjectId(branchId)) return res.status(400).json({ error: "Chi nhánh không hợp lệ" });
        if (!await Branch.findById(branchId)) return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
        const [staff, assigned] = await Promise.all([directory(), StylistProfile.find({})]);
        const existing = new Set(assigned.map((item) => String(item.userId)));
        return res.json({ candidates: staff.filter((item) => item.fullName && !existing.has(item.id))
          .map((item) => ({ id: item.id, email: item.email, fullName: item.fullName })) });
      } catch (error) { return next(error); }
    },
    async getMe(req, res, next) {
      try {
        const allAssignments = await StylistProfile.find({ userId: req.auth.userId });
        const primary = primaryProfileIds(allAssignments);
        const assignments = allAssignments.filter((item) => item.isActive && primary.has(String(item._id)));
        const branches = await Branch.find({ _id: { $in: assignments.map((item) => item.branchId) } });
        const staff = assignments.length ? await directory() : [];
        const byId = new Map(branches.map((branch) => [String(branch.id), branch]));
        return res.json({ profiles: assignments.map((item) => {
          const branch = byId.get(String(item.branchId));
          return { id: String(item.id), userId: String(item.userId), displayName: currentName(item, staff),
            branchId: String(item.branchId), branchName: branch?.name || null,
            branchAddress: branch?.address || null };
        }) });
      } catch (error) { return next(error); }
    },
    async assignToBranch(req, res, next) {
      try {
        const { branchId } = req.params;
        const branch = await Branch.findById(branchId);
        if (!branch) {
          return res.status(404).json({ error: "Không tìm thấy chi nhánh" });
        }

        const { userId, isActive } = req.body || {};
        if (!req.body || Object.keys(req.body).some((key) => !["userId", "isActive"].includes(key))) {
          return res.status(400).json({ error: "Chỉ chọn tài khoản Stylist và trạng thái" });
        }
        if (!userId || !isValidObjectId(userId)) {
          return res.status(400).json({ error: "Mã tài khoản (userId) 24 ký tự hex hợp lệ là bắt buộc" });
        }
        const staff = (await directory()).find((item) => item.id === userId);
        if (!staff) return res.status(409).json({ error: "Cần tài khoản Stylist đang hoạt động" });
        if (!staff.fullName) return res.status(409).json({ error: "Admin cần bổ sung họ tên cho tài khoản Stylist" });

        const existing = await StylistProfile.findOne({ userId });
        if (existing) {
          return res.status(409).json({ error: String(existing.branchId) === branchId ?
            "Stylist đã được gán vào chi nhánh này" : "Stylist đã được gán ở chi nhánh khác. Hãy chuyển chi nhánh trong hồ sơ hiện có." });
        }

        const stylist = await StylistProfile.create({
          userId,
          assignmentKey: userId,
          branchId,
          displayName: staff.fullName,
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        });

        return res.status(201).json({ stylist });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({ error: "Stylist đã được gán vào một chi nhánh" });
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
        const related = stylists.length ? await StylistProfile.find({ userId: { $in: stylists.map((item) => item.userId) } }) : [];
        const primary = primaryProfileIds(related);
        const staff = stylists.length ? await directory() : [];
        return res.json({ stylists: stylists.filter((item) => primary.has(String(item._id)))
          .map((item) => publicProfile(item, staff)) });
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
        return res.json({ stylist: publicProfile(stylist, await directory()) });
      } catch (error) {
        return next(error);
      }
    },

    async update(req, res, next) {
      try {
        const { branchId, isActive } = req.body || {};
        const updateData = {};
        if (!req.body || !Object.keys(req.body).length || Object.keys(req.body).some((key) => !["branchId", "isActive"].includes(key))) {
          return res.status(400).json({ error: "Họ tên do System Admin quản lý" });
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
          if (String(current.branchId) !== String(branchId) && WorkShift &&
              await WorkShift.exists({ stylistId: current.userId, endAt: { $gt: new Date() } })) {
            return res.status(409).json({ error: "Hãy xử lý các ca làm sắp tới trước khi chuyển chi nhánh" });
          }
          const duplicate = await StylistProfile.findOne({ userId: current.userId, branchId, _id: { $ne: current._id } });
          if (duplicate) await StylistProfile.deleteOne({ _id: duplicate._id, userId: current.userId, branchId });
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
        return res.json({ stylist: publicProfile(stylist, await directory()) });
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
