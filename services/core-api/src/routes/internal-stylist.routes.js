const { Router } = require("express");
const jwt = require("jsonwebtoken");

function createInternalStylistRouter({ models, secret }) {
  const router = Router();
  router.get("/stylists/:id/obligations", async (req, res, next) => {
    try {
      const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
      if (!match) return res.status(401).json({ error: "Internal authentication required" });
      let claims;
      try { claims = jwt.verify(match[1], secret, { algorithms: ["HS256"], issuer: "auth-service" }); }
      catch { return res.status(401).json({ error: "Invalid internal token" }); }
      if (claims.scope !== "stylist-obligations") return res.status(403).json({ error: "Invalid scope" });
      if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid stylist id" });
      const now = new Date();
      const [shift, appointment] = await Promise.all([
        models.WorkShift.exists({ stylistId: req.params.id, endAt: { $gt: now } }),
        models.Calendar.exists({ _id: req.params.id, appointments: {
          $elemMatch: { status: { $in: ["booked", "completed"] } },
        } }),
      ]);
      res.set("Cache-Control", "no-store");
      return res.json({ hasPendingWork: Boolean(shift || appointment) });
    } catch (error) { return next(error); }
  });
  return router;
}

module.exports = { createInternalStylistRouter };
