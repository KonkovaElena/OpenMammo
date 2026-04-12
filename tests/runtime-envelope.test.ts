import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/application/createApp";
import { createMonitoring } from "../src/monitoring";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.10",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 58,
    breastDensity: "B",
    accessionNumber: "ACC-ENVELOPE-001",
  },
  clinicalQuestion: {
    questionText: "Create a draft second opinion for the current FFDM screening exam.",
    urgency: "routine",
  },
} as const;

test("readyz exposes runtime envelope and logs completed requests", async () => {
  const { metricsRegistry, requestCounter } = createMonitoring();
  const logEntries: Array<Record<string, unknown>> = [];

  const app = createApp({
    metricsEnabled: true,
    metricsRegistry,
    requestCounter,
    isShuttingDown: () => false,
    startedAt: new Date("2026-04-05T00:00:00.000Z"),
    logger: {
      info(entry) {
        logEntries.push(entry);
      },
      error(entry) {
        logEntries.push(entry);
      },
    },
    generateCase: async () => {
      throw new Error("not used in readiness test");
    },
  });

  const response = await request(app)
    .get("/readyz")
    .set("x-request-id", "req-ready-123")
    .set("x-correlation-id", "corr-ready-456");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ready");
  assert.equal(response.body.product.name, "mammography-second-opinion");
  assert.equal(response.body.product.version, "0.1.0");
  assert.equal(response.body.runtime.metricsEnabled, true);
  assert.equal(response.body.runtime.shuttingDown, false);
  assert.equal(typeof response.body.runtime.uptimeSeconds, "number");
  assert.ok(response.body.runtime.uptimeSeconds >= 0);

  const completionLog = logEntries.find((entry) => entry.event === "http.request.completed");
  assert.ok(completionLog);
  assert.equal(completionLog?.requestId, "req-ready-123");
  assert.equal(completionLog?.correlationId, "corr-ready-456");
  assert.equal(completionLog?.path, "/readyz");
  assert.equal(completionLog?.statusCode, 200);
});

test("internal errors return request-aware envelopes and emit failure logs", async () => {
  const { metricsRegistry, requestCounter } = createMonitoring();
  const logEntries: Array<Record<string, unknown>> = [];

  const app = createApp({
    metricsEnabled: false,
    metricsRegistry,
    requestCounter,
    isShuttingDown: () => false,
    startedAt: new Date("2026-04-05T00:00:00.000Z"),
    logger: {
      info(entry) {
        logEntries.push(entry);
      },
      error(entry) {
        logEntries.push(entry);
      },
    },
    generateCase: async () => {
      throw new Error("boom");
    },
  });

  const response = await request(app)
    .post("/api/v1/cases")
    .set("x-request-id", "req-error-123")
    .send(validCaseRequest);

  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, "INTERNAL_ERROR");
  assert.equal(response.body.error.requestId, "req-error-123");
  assert.equal(response.body.error.correlationId, "req-error-123");

  const failureLog = logEntries.find((entry) => entry.event === "http.request.failed");
  assert.ok(failureLog);
  assert.equal(failureLog?.requestId, "req-error-123");
  assert.equal(failureLog?.correlationId, "req-error-123");
  assert.equal(failureLog?.path, "/api/v1/cases");
  assert.equal(failureLog?.errorName, "Error");
});

test("case intake rate limiting returns a request-aware 429 with Retry-After", async () => {
  const { metricsRegistry, requestCounter } = createMonitoring();
  const logEntries: Array<Record<string, unknown>> = [];

  const app = createApp({
    metricsEnabled: false,
    metricsRegistry,
    requestCounter,
    isShuttingDown: () => false,
    startedAt: new Date("2026-04-05T00:00:00.000Z"),
    caseIntakeRateLimit: {
      windowMs: 60_000,
      maxRequests: 1,
    },
    logger: {
      info(entry) {
        logEntries.push(entry);
      },
      error(entry) {
        logEntries.push(entry);
      },
    },
    generateCase: async () => ({
      caseId: "9cb39adf-3f3b-4fd0-8f33-0a5dfd940001",
      status: "AwaitingReview",
      assessment: {
        biradsCategory: "0",
        summary: "Baseline draft",
        confidenceBand: "moderate",
        outputMode: "draft-only",
        findings: ["Four standard views are present."],
        recommendations: ["Radiologist review is required."],
      },
      qc: {
        status: "pass",
        findingCount: 0,
        findings: [],
      },
      generation: {
        orchestratorId: "baseline-draft-orchestrator:v1",
        modelId: "baseline-rule-engine:v0",
        totalLatencyMs: 0,
        stages: [
          { name: "exam-qc", status: "completed", latencyMs: 0 },
          { name: "draft-generation", status: "completed", latencyMs: 0 },
          { name: "safety-evaluation", status: "completed", latencyMs: 0 },
        ],
      },
      review: null,
      delivery: null,
      safety: {
        flagCount: 0,
        hasBlockingFlags: false,
      },
    }),
  });

  const firstResponse = await request(app)
    .post("/api/v1/cases")
    .set("x-request-id", "req-rate-limit-001")
    .send(validCaseRequest);

  assert.equal(firstResponse.status, 201);

  const secondResponse = await request(app)
    .post("/api/v1/cases")
    .set("x-request-id", "req-rate-limit-002")
    .send(validCaseRequest);

  assert.equal(secondResponse.status, 429);
  assert.equal(secondResponse.body.error.code, "CASE_INTAKE_RATE_LIMITED");
  assert.equal(secondResponse.body.error.requestId, "req-rate-limit-002");
  assert.equal(secondResponse.body.error.correlationId, "req-rate-limit-002");
  assert.equal(secondResponse.headers["retry-after"], "60");
  assert.equal(secondResponse.body.error.retryAfterSeconds, 60);

  const rateLimitLog = logEntries.find((entry) => entry.event === "http.request.rate_limited");
  assert.ok(rateLimitLog);
  assert.equal(rateLimitLog?.path, "/api/v1/cases");
  assert.equal(rateLimitLog?.requestId, "req-rate-limit-002");
  assert.equal(rateLimitLog?.limit, 1);
});