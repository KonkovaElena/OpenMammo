import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.90",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 63,
    breastDensity: "B",
    accessionNumber: "ACC-REPORT-001",
  },
  clinicalQuestion: {
    questionText: "Create a finalized case and render a clinician report artifact.",
    urgency: "routine",
  },
} as const;

const validReviewRequest = {
  reviewerName: "Dr. Elena Konkova",
  reviewerRole: "breast-imaging-radiologist",
  disposition: "modified",
  finalBiradsCategory: "3",
  finalSummary: "Probably benign asymmetry; short-interval follow-up advised.",
  reviewNotes: "Final report rendered after clinician modification of the baseline draft.",
} as const;

test("GET /api/v1/cases/:caseId/report renders a finalized clinician report", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-report-store-"));
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

    const reportResponse = await request(runtime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/report`)
      .set("x-request-id", "req-report-001");

    assert.equal(reportResponse.status, 200);
    assert.equal(reportResponse.body.caseId, createResponse.body.caseId);
    assert.equal(reportResponse.body.status, "Finalized");
    assert.equal(reportResponse.body.report.format, "text/plain");
    assert.equal(reportResponse.body.report.filename, `${createResponse.body.caseId}.txt`);
    assert.match(reportResponse.body.report.body, /Mammography Second Opinion Report/);
    assert.match(reportResponse.body.report.body, /Dr\. Elena Konkova/);
    assert.match(reportResponse.body.report.body, /Probably benign asymmetry/);
    assert.match(reportResponse.body.report.body, /BI-RADS: 3/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId/report rejects report rendering before clinician finalization", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-report-not-ready-"));
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

    const reportResponse = await request(runtime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/report`)
      .set("x-request-id", "req-report-not-ready");

    assert.equal(reportResponse.status, 409);
    assert.equal(reportResponse.body.error.code, "CASE_REPORT_NOT_READY");
    assert.equal(reportResponse.body.error.requestId, "req-report-not-ready");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});