const express = require("express");
const { apiReference } = require("@scalar/express-api-reference");
const openapiSpec = require("./openapi.json");

/**
 * Creates Express router providing:
 * - GET /docs: Interactive Scalar API documentation UI
 * - GET /openapi.json: Raw OpenAPI 3.0.3 specification
 *
 * @param {object} [customConfig] - Optional override for scalar configuration
 * @returns {import("express").Router}
 */
function createDocsRouter(customConfig = {}) {
  const router = express.Router();

  // Expose the raw OpenAPI JSON specification
  router.get("/openapi.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.json(openapiSpec);
  });

  // Mount Scalar API Reference UI
  router.use(
    "/docs",
    apiReference({
      pageTitle: "30Shine Backend API Reference",
      theme: "saturn",
      darkMode: true,
      layout: "modern",
      searchHotKey: "k",
      metaData: {
        title: "30Shine Backend API Reference",
        description: "Tài liệu test API theo các task backend SHINE",
      },
      spec: {
        content: openapiSpec,
      },
      ...customConfig,
    })
  );

  return router;
}

module.exports = { createDocsRouter, openapiSpec };
