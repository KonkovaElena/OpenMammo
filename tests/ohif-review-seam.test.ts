import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.99",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 57,
    breastDensity: "C",
    accessionNumber: "ACC-OHIF-001",
  },
  clinicalQuestion: {
    questionText: "Create a case and expose an OHIF-compatible review seam manifest.",
    urgency: "routine",
  },
} as const;

test("GET /api/v1/cases/:caseId/review-seams/ohif returns an OHIF-compatible launch manifest", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-ohif-seam-"));
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

    const seamResponse = await request(runtime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/review-seams/ohif`)
      .set("x-request-id", "req-ohif-001");

    assert.equal(seamResponse.status, 200);
    assert.equal(seamResponse.body.caseId, createResponse.body.caseId);
    assert.equal(seamResponse.body.viewer.vendor, "OHIF");
    assert.equal(seamResponse.body.viewer.viewerPath, "/viewer");
    assert.equal(seamResponse.body.viewer.query.StudyInstanceUIDs[0], validCaseRequest.exam.studyInstanceUid);
    assert.equal(seamResponse.body.viewer.query.modalities, "MG");
    assert.equal(seamResponse.body.dataSource.namespace, "dicomweb");
    assert.equal(seamResponse.body.dataSource.ready, false);
    assert.equal(seamResponse.body.workflow.caseStatus, "AwaitingReview");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId/review-seams/ohif returns 404 for a missing case", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const response = await request(runtime.app)
    .get("/api/v1/cases/00000000-0000-0000-0000-000000000000/review-seams/ohif")
    .set("x-request-id", "req-ohif-404");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "CASE_NOT_FOUND");
  assert.equal(response.body.error.requestId, "req-ohif-404");
});