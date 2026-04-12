import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.70",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 61,
    breastDensity: "C",
    accessionNumber: "ACC-REVIEW-001",
  },
  clinicalQuestion: {
    questionText: "Create a draft case that will later be finalized by a radiologist.",
    urgency: "routine",
  },
} as const;

const validReviewRequest = {
  reviewerName: "Dr. Elena Konkova",
  reviewerRole: "breast-imaging-radiologist",
  disposition: "confirmed",
  finalBiradsCategory: "2",
  finalSummary: "No suspicious correlate on FFDM review; benign screening assessment.",
  reviewNotes: "Draft confirmed after radiologist review.",
} as const;

test("POST /api/v1/cases/:caseId/review finalizes a draft case and persists clinician review details", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-review-store-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const firstRuntime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const createResponse = await request(firstRuntime.app)
      .post("/api/v1/cases")
      .send(validCaseRequest);

    assert.equal(createResponse.status, 201);

    const secondRuntime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const reviewResponse = await request(secondRuntime.app)
      .post(`/api/v1/cases/${createResponse.body.caseId}/review`)
      .set("x-request-id", "req-review-001")
      .set("x-correlation-id", "corr-review-001")
      .set("x-actor-id", "radiologist-002")
      .set("x-actor-role", "radiologist")
      .send(validReviewRequest);

    assert.equal(reviewResponse.status, 200);
    assert.equal(reviewResponse.body.caseId, createResponse.body.caseId);
    assert.equal(reviewResponse.body.status, "Finalized");
    assert.equal(reviewResponse.body.review.reviewerName, validReviewRequest.reviewerName);
    assert.equal(reviewResponse.body.review.reviewerRole, validReviewRequest.reviewerRole);
    assert.equal(reviewResponse.body.review.disposition, validReviewRequest.disposition);
    assert.equal(reviewResponse.body.review.finalBiradsCategory, validReviewRequest.finalBiradsCategory);
    assert.equal(reviewResponse.body.review.finalSummary, validReviewRequest.finalSummary);
    assert.equal(reviewResponse.body.review.reviewNotes, validReviewRequest.reviewNotes);
    assert.equal(typeof reviewResponse.body.review.finalizedAt, "string");

    const thirdRuntime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const persistedCaseResponse = await request(thirdRuntime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}`)
      .set("x-request-id", "req-review-002");

    assert.equal(persistedCaseResponse.status, 200);
    assert.equal(persistedCaseResponse.body.status, "Finalized");
    assert.equal(persistedCaseResponse.body.review.finalSummary, validReviewRequest.finalSummary);

    const eventsResponse = await request(thirdRuntime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/events`)
      .set("x-request-id", "req-review-events");

    assert.equal(eventsResponse.status, 200);
    assert.equal(eventsResponse.body.events.at(-1)?.type, "mammography.case-review-finalized.v1");
    assert.equal(eventsResponse.body.events.at(-1)?.payload.disposition, validReviewRequest.disposition);
    assert.equal(eventsResponse.body.events.at(-1)?.payload.reviewerName, validReviewRequest.reviewerName);
    assert.equal(eventsResponse.body.events.at(-1)?.audit.requestId, "req-review-001");
    assert.equal(eventsResponse.body.events.at(-1)?.audit.correlationId, "corr-review-001");
    assert.equal(eventsResponse.body.events.at(-1)?.audit.actorId, "radiologist-002");
    assert.equal(eventsResponse.body.events.at(-1)?.audit.actorRole, "radiologist");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("POST /api/v1/cases/:caseId/review rejects duplicate finalization attempts", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-review-conflict-"));
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

    const firstReview = await request(runtime.app)
      .post(`/api/v1/cases/${createResponse.body.caseId}/review`)
      .send(validReviewRequest);

    assert.equal(firstReview.status, 200);

    const secondReview = await request(runtime.app)
      .post(`/api/v1/cases/${createResponse.body.caseId}/review`)
      .set("x-request-id", "req-review-conflict")
      .send(validReviewRequest);

    assert.equal(secondReview.status, 409);
    assert.equal(secondReview.body.error.code, "CASE_REVIEW_CONFLICT");
    assert.equal(secondReview.body.error.requestId, "req-review-conflict");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});