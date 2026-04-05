import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.130",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 60,
    breastDensity: "C",
    accessionNumber: "ACC-EXPORT-001",
  },
  clinicalQuestion: {
    questionText: "Create a case and export the finalized report as a text attachment.",
    urgency: "routine",
  },
} as const;

const validReviewRequest = {
  reviewerName: "Dr. Elena Konkova",
  reviewerRole: "breast-imaging-radiologist",
  disposition: "confirmed",
  finalBiradsCategory: "2",
  finalSummary: "Benign screening mammogram without suspicious correlate.",
  reviewNotes: "Ready for text export.",
} as const;

test("GET /api/v1/cases/:caseId/report/export returns a text attachment for finalized cases", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-export-store-"));
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

    const exportResponse = await request(runtime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/report/export`)
      .set("x-request-id", "req-export-001");

    assert.equal(exportResponse.status, 200);
    assert.match(String(exportResponse.headers["content-type"]), /^text\/plain/);
    assert.equal(
      exportResponse.headers["content-disposition"],
      `attachment; filename="${createResponse.body.caseId}.txt"`,
    );
    assert.match(exportResponse.text, /Mammography Second Opinion Report/);
    assert.match(exportResponse.text, /Benign screening mammogram/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId/report/export rejects export before clinician finalization", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-export-not-ready-"));
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

    const exportResponse = await request(runtime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/report/export`)
      .set("x-request-id", "req-export-not-ready");

    assert.equal(exportResponse.status, 409);
    assert.equal(exportResponse.body.error.code, "CASE_REPORT_NOT_READY");
    assert.equal(exportResponse.body.error.requestId, "req-export-not-ready");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});