import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

test("kernel routes expose standalone health, readiness, metrics, and manifest", async () => {
  const { app } = bootstrap({
    metricsEnabled: true,
    isShuttingDown: () => false,
  });

  const health = await request(app).get("/healthz");
  assert.equal(health.status, 200);
  assert.equal(health.body.status, "ok");
  assert.equal(health.body.scope.modality, "FFDM");
  assert.ok(health.headers["x-request-id"]);
  assert.ok(health.headers["x-correlation-id"]);

  const ready = await request(app).get("/readyz");
  assert.equal(ready.status, 200);
  assert.equal(ready.body.status, "ready");

  const manifest = await request(app).get("/api/v1/manifest");
  assert.equal(manifest.status, 200);
  assert.equal(manifest.body.scope.modality, "FFDM");
  assert.deepEqual(manifest.body.scope.standardViews, ["L-CC", "L-MLO", "R-CC", "R-MLO"]);
  assert.equal(manifest.body.safety.reviewRequired, true);
  assert.equal(manifest.body.safety.outputMode, "draft-only");
  assert.ok(manifest.body.nonGoals.includes("DBT"));

  const metrics = await request(app).get("/metrics");
  assert.equal(metrics.status, 200);
  assert.match(metrics.text, /mammography_second_opinion_http_requests_total/);
});

test("readiness reports shutting_down when bootstrap indicates shutdown", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => true,
  });

  const response = await request(app).get("/readyz");
  assert.equal(response.status, 503);
  assert.equal(response.body.status, "shutting_down");
});