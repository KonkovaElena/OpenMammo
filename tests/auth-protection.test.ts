import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.120",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 60,
    breastDensity: "B",
    accessionNumber: "ACC-AUTH-001",
  },
  clinicalQuestion: {
    questionText: "Create a protected workflow case for auth tests.",
    urgency: "routine",
  },
} as const;

test("protected case routes return 401 with Bearer challenge when auth is enabled and credentials are missing", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
    protectedApiAuth: {
      bearerToken: "static-bearer-token",
      actorId: "trusted-client",
      actorRole: "service",
    },
  });

  const response = await request(app)
    .post("/api/v1/cases")
    .set("x-request-id", "req-auth-missing-001")
    .send(validCaseRequest);

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "AUTHENTICATION_REQUIRED");
  assert.equal(response.headers["www-authenticate"], 'Bearer realm="openmammo"');
});

test("protected case routes reject malformed or invalid bearer credentials", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
    protectedApiAuth: {
      bearerToken: "static-bearer-token",
      actorId: "trusted-client",
      actorRole: "service",
    },
  });

  const malformedResponse = await request(app)
    .get("/api/v1/cases")
    .set("Authorization", "Token nope")
    .set("x-request-id", "req-auth-malformed-001");

  assert.equal(malformedResponse.status, 400);
  assert.equal(malformedResponse.body.error.code, "INVALID_AUTHORIZATION_HEADER");
  assert.match(malformedResponse.headers["www-authenticate"], /error="invalid_request"/);

  const invalidTokenResponse = await request(app)
    .get("/api/v1/cases")
    .set("Authorization", "Bearer wrong-token")
    .set("x-request-id", "req-auth-invalid-001");

  assert.equal(invalidTokenResponse.status, 401);
  assert.equal(invalidTokenResponse.body.error.code, "INVALID_BEARER_TOKEN");
  assert.match(invalidTokenResponse.headers["www-authenticate"], /error="invalid_token"/);
});

test("protected case routes accept a valid bearer token and derive trusted actor audit context from config", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
    protectedApiAuth: {
      bearerToken: "static-bearer-token",
      actorId: "trusted-client",
      actorRole: "service",
    },
  });

  const createResponse = await request(app)
    .post("/api/v1/cases")
    .set("Authorization", "Bearer static-bearer-token")
    .set("x-request-id", "req-auth-valid-001")
    .set("x-correlation-id", "corr-auth-valid-001")
    .set("x-actor-id", "spoofed-client")
    .set("x-actor-role", "spoofed-role")
    .send(validCaseRequest);

  assert.equal(createResponse.status, 201);

  const getResponse = await request(app)
    .get(`/api/v1/cases/${createResponse.body.caseId}`)
    .set("Authorization", "Bearer static-bearer-token")
    .set("x-request-id", "req-auth-valid-002");

  assert.equal(getResponse.status, 200);

  const eventsResponse = await request(app)
    .get(`/api/v1/cases/${createResponse.body.caseId}/events`)
    .set("Authorization", "Bearer static-bearer-token")
    .set("x-request-id", "req-auth-valid-events-001");

  assert.equal(eventsResponse.status, 200);
  assert.ok(eventsResponse.body.events.length >= 5);

  for (const event of eventsResponse.body.events) {
    assert.equal(event.audit.actorId, "trusted-client");
    assert.equal(event.audit.actorRole, "service");
    assert.equal(event.audit.requestId, "req-auth-valid-001");
    assert.equal(event.audit.correlationId, "corr-auth-valid-001");
  }
});

test("public health and manifest routes stay available without bearer auth even when case-route protection is enabled", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
    protectedApiAuth: {
      bearerToken: "static-bearer-token",
      actorId: "trusted-client",
      actorRole: "service",
    },
  });

  const health = await request(app).get("/healthz");
  const manifest = await request(app).get("/api/v1/manifest");

  assert.equal(health.status, 200);
  assert.equal(manifest.status, 200);
});