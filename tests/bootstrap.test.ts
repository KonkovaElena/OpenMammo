import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

test("bootstrap returns manifest and serves hardened health responses", async () => {
  const { app, manifest, metricsRegistry } = bootstrap({
    metricsEnabled: true,
    isShuttingDown: () => false,
  });

  assert.equal(manifest.scope.modality, "FFDM");
  assert.equal(manifest.safety.outputMode, "draft-only");
  assert.ok(
    metricsRegistry.getSingleMetric("mammography_second_opinion_http_requests_total"),
  );

  const response = await request(app).get("/healthz");

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["cross-origin-opener-policy"], "same-origin");
  assert.equal(response.headers["cross-origin-resource-policy"], "same-origin");
  assert.equal(response.headers["origin-agent-cluster"], "?1");
  assert.equal(response.headers["referrer-policy"], "no-referrer");
});