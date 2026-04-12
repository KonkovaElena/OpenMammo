import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.150",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 61,
    breastDensity: "C",
    accessionNumber: "ACC-SAFETY-001",
  },
  clinicalQuestion: {
    questionText: "Create a clinician-reviewed second-opinion draft for safety invariant tests.",
    urgency: "routine",
  },
} as const;

const validReviewRequest = {
  reviewerName: "Dr. Elena Konkova",
  reviewerRole: "breast-imaging-radiologist",
  disposition: "confirmed",
  finalBiradsCategory: "2",
  finalSummary: "Clinician-confirmed benign screening interpretation.",
  reviewNotes: "Safety invariant confirms clinician review is the gate to downstream actions.",
} as const;

const validDeliveryRequest = {
  channel: "secure-email",
  destination: "breastcenter@example.org",
  recipientName: "Breast Center Intake",
  deliveredBy: "workflow-operator-01",
} as const;

async function createDraftCase(app: ReturnType<typeof bootstrap>["app"]): Promise<string> {
  const createResponse = await request(app)
    .post("/api/v1/cases")
    .send(validCaseRequest);

  assert.equal(createResponse.status, 201);
  return createResponse.body.caseId;
}

test("manifest exposes the clinician-reviewed, draft-only FFDM safety contract", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const manifestResponse = await request(runtime.app)
    .get("/api/v1/manifest")
    .set("x-request-id", "req-safety-manifest-001");

  assert.equal(manifestResponse.status, 200);
  assert.equal(manifestResponse.body.product.mode, "clinician-in-the-loop");
  assert.equal(manifestResponse.body.scope.modality, "FFDM");
  assert.deepEqual(manifestResponse.body.scope.standardViews, ["L-CC", "L-MLO", "R-CC", "R-MLO"]);
  assert.equal(manifestResponse.body.safety.reviewRequired, true);
  assert.equal(manifestResponse.body.safety.outputMode, "draft-only");
  assert.equal(manifestResponse.body.safety.autonomousDiagnosis, false);
});

test("intake rejects studies outside the FFDM scope boundary", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const response = await request(runtime.app)
    .post("/api/v1/cases")
    .send({
      exam: {
        ...validCaseRequest.exam,
        modality: "MRI",
      },
      clinicalQuestion: validCaseRequest.clinicalQuestion,
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "INVALID_REQUEST_BODY");
});

test("report rendering and delivery stay blocked until clinician finalization", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const caseId = await createDraftCase(runtime.app);

  const reportResponse = await request(runtime.app)
    .get(`/api/v1/cases/${caseId}/report`)
    .set("x-request-id", "req-safety-report-blocked-001");

  assert.equal(reportResponse.status, 409);
  assert.equal(reportResponse.body.error.code, "CASE_REPORT_NOT_READY");

  const deliveryResponse = await request(runtime.app)
    .post(`/api/v1/cases/${caseId}/deliver`)
    .set("x-request-id", "req-safety-delivery-blocked-001")
    .send(validDeliveryRequest);

  assert.equal(deliveryResponse.status, 409);
  assert.equal(deliveryResponse.body.error.code, "CASE_DELIVERY_CONFLICT");
});

test("report sealing requires finalization and remains single-use after the first seal", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const caseId = await createDraftCase(runtime.app);

  const prematureSealResponse = await request(runtime.app)
    .post(`/api/v1/cases/${caseId}/report/seal`)
    .set("x-request-id", "req-safety-seal-blocked-001")
    .send({ sealedBy: "Dr. Elena Konkova" });

  assert.equal(prematureSealResponse.status, 409);
  assert.equal(prematureSealResponse.body.error.code, "CASE_REPORT_SEAL_NOT_READY");

  const reviewResponse = await request(runtime.app)
    .post(`/api/v1/cases/${caseId}/review`)
    .send(validReviewRequest);

  assert.equal(reviewResponse.status, 200);
  assert.equal(reviewResponse.body.status, "Finalized");

  const firstSealResponse = await request(runtime.app)
    .post(`/api/v1/cases/${caseId}/report/seal`)
    .set("x-request-id", "req-safety-seal-first-001")
    .send({ sealedBy: "Dr. Elena Konkova" });

  assert.equal(firstSealResponse.status, 201);

  const secondSealResponse = await request(runtime.app)
    .post(`/api/v1/cases/${caseId}/report/seal`)
    .set("x-request-id", "req-safety-seal-second-001")
    .send({ sealedBy: "Dr. Elena Konkova" });

  assert.equal(secondSealResponse.status, 409);
  assert.equal(secondSealResponse.body.error.code, "CASE_REPORT_SEAL_CONFLICT");
});