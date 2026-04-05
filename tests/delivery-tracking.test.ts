import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.95",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 59,
    breastDensity: "C",
    accessionNumber: "ACC-DELIVERY-001",
  },
  clinicalQuestion: {
    questionText: "Create a case that will be finalized and delivery-tracked.",
    urgency: "routine",
  },
} as const;

const validReviewRequest = {
  reviewerName: "Dr. Elena Konkova",
  reviewerRole: "breast-imaging-radiologist",
  disposition: "confirmed",
  finalBiradsCategory: "1",
  finalSummary: "Negative screening mammogram.",
  reviewNotes: "Ready for delivery after clinician confirmation.",
} as const;

const validDeliveryRequest = {
  channel: "secure-email",
  destination: "breastcenter@example.org",
  recipientName: "Breast Center Intake",
  deliveredBy: "workflow-operator-01",
} as const;

test("POST /api/v1/cases/:caseId/deliver records a finalized case delivery and persists it", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-delivery-store-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const runtime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const createResponse = await request(runtime.app)
      .post("/api/v1/cases")
      .send(validCaseRequest);

    assert.equal(createResponse.status, 201);

    const reviewResponse = await request(runtime.app)
      .post(`/api/v1/cases/${createResponse.body.caseId}/review`)
      .send(validReviewRequest);

    assert.equal(reviewResponse.status, 200);

    const deliveryResponse = await request(runtime.app)
      .post(`/api/v1/cases/${createResponse.body.caseId}/deliver`)
      .set("x-request-id", "req-delivery-001")
      .send(validDeliveryRequest);

    assert.equal(deliveryResponse.status, 200);
    assert.equal(deliveryResponse.body.caseId, createResponse.body.caseId);
    assert.equal(deliveryResponse.body.status, "Finalized");
    assert.equal(deliveryResponse.body.delivery.channel, validDeliveryRequest.channel);
    assert.equal(deliveryResponse.body.delivery.destination, validDeliveryRequest.destination);
    assert.equal(deliveryResponse.body.delivery.recipientName, validDeliveryRequest.recipientName);
    assert.equal(deliveryResponse.body.delivery.deliveredBy, validDeliveryRequest.deliveredBy);
    assert.equal(typeof deliveryResponse.body.delivery.deliveredAt, "string");

    const restartedRuntime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const persistedCase = await request(restartedRuntime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}`)
      .set("x-request-id", "req-delivery-002");

    assert.equal(persistedCase.status, 200);
    assert.equal(persistedCase.body.delivery.channel, validDeliveryRequest.channel);
    assert.equal(persistedCase.body.delivery.deliveredBy, validDeliveryRequest.deliveredBy);

    const eventsResponse = await request(restartedRuntime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/events`)
      .set("x-request-id", "req-delivery-events");

    assert.equal(eventsResponse.status, 200);
    assert.equal(eventsResponse.body.events.at(-1)?.type, "mammography.case-delivered.v1");
    assert.equal(eventsResponse.body.events.at(-1)?.payload.channel, validDeliveryRequest.channel);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("POST /api/v1/cases/:caseId/deliver rejects delivery before clinician finalization", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-delivery-not-ready-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const runtime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const createResponse = await request(runtime.app)
      .post("/api/v1/cases")
      .send(validCaseRequest);

    assert.equal(createResponse.status, 201);

    const deliveryResponse = await request(runtime.app)
      .post(`/api/v1/cases/${createResponse.body.caseId}/deliver`)
      .set("x-request-id", "req-delivery-not-ready")
      .send(validDeliveryRequest);

    assert.equal(deliveryResponse.status, 409);
    assert.equal(deliveryResponse.body.error.code, "CASE_DELIVERY_CONFLICT");
    assert.equal(deliveryResponse.body.error.requestId, "req-delivery-not-ready");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});