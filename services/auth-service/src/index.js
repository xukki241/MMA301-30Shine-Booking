const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "auth-service" });
});

const port = process.env.PORT || 4101;
app.listen(port, "0.0.0.0", () => {
  console.log(`auth-service on ${port}`);
});
