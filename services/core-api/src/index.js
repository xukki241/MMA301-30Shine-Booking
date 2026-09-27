const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "core-api" });
});

// TODO: branches, services, stylists, work-shifts, appointments, payments

const port = process.env.PORT || 4102;
app.listen(port, "0.0.0.0", () => {
  console.log(`core-api on ${port}`);
});
