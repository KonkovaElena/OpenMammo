import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.120",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 55,
    breastDensity: "B",
    accessionNumber: "ACC-ARCHIVE-001",
  },
  clinicalQuestion: {
    questionText: "Create a case and expose an Orthanc/DICOMweb-compatible archive seam.",
    urgency: "routine",
  },
} as const;

test("GET /api/v1/cases/:caseId/archive-seams/dicomweb returns an Orthanc-compatible DICOMweb manifest", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-archive-seam-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const runtime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
      orthancBaseUrl: "http://localhost:8042/",
    });

    const createResponse = await request(runtime.app)
      .post("/api/v1/cases")
      .send(validCaseRequest);

    assert.equal(createResponse.status, 201);

    const archiveResponse = await request(runtime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/archive-seams/dicomweb`)
      .set("x-request-id", "req-archive-001");

    assert.equal(archiveResponse.status, 200);
    assert.equal(archiveResponse.body.caseId, createResponse.body.caseId);
    assert.equal(archiveResponse.body.study.studyInstanceUid, validCaseRequest.exam.studyInstanceUid);
    assert.equal(archiveResponse.body.archive.vendor, "Orthanc");
    assert.equal(archiveResponse.body.archive.sourceName, "dicomweb");
    assert.equal(archiveResponse.body.archive.ready, true);
    assert.equal(archiveResponse.body.archive.dicomwebRoot, "http://localhost:8042/dicom-web");
    assert.equal(archiveResponse.body.archive.qidoRoot, "http://localhost:8042/dicom-web");
    assert.equal(archiveResponse.body.archive.wadoRoot, "http://localhost:8042/dicom-web");
    assert.equal(archiveResponse.body.archive.wadoUriRoot, "http://localhost:8042/wado");
    assert.equal(archiveResponse.body.workflow.ohifReviewSeamPath, `/api/v1/cases/${createResponse.body.caseId}/review-seams/ohif`);

    const ohifResponse = await request(runtime.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/review-seams/ohif`)
      .set("x-request-id", "req-archive-ohif");

    assert.equal(ohifResponse.status, 200);
    assert.equal(ohifResponse.body.dataSource.ready, true);
    assert.equal(ohifResponse.body.dataSource.qidoRoot, "http://localhost:8042/dicom-web");
    assert.equal(ohifResponse.body.dataSource.wadoUriRoot, "http://localhost:8042/wado");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId/archive-seams/dicomweb returns 404 for a missing case", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
    orthancBaseUrl: "http://localhost:8042/",
  });

  const response = await request(runtime.app)
    .get("/api/v1/cases/00000000-0000-0000-0000-000000000000/archive-seams/dicomweb")
    .set("x-request-id", "req-archive-404");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "CASE_NOT_FOUND");
  assert.equal(response.body.error.requestId, "req-archive-404");
});