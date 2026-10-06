const express = require("express");
const cors = require("cors");
const { createDocsRouter } = require("./routes");

const app = express();
app.disable("x-powered-by");
app.use(cors());

// Mount docs router directly at root: /docs and /openapi.json
app.use(createDocsRouter());

// Redirect root URL to /docs for convenience
app.get("/", (_req, res) => {
  res.redirect("/docs");
});

const PORT = process.env.DOCS_PORT || 4001;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  30Shine Scalar API Documentation is running!`);
  console.log(`  - Docs UI:     http://localhost:${PORT}/docs`);
  console.log(`  - OpenAPI JSON: http://localhost:${PORT}/openapi.json`);
  console.log(`====================================================`);
});
