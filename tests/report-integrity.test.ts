import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const validCaseRequest = {
  exam: {
    studyInstanceUid: "1.2.840.10008.1.2.3.110",
    modality: "FFDM",
    standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
    patientAge: 55,
    breastDensity: "C",
    accessionNumber: "ACC-SEAL-001",
  },
  clinicalQuestion: {
    questionText: "Create a finalized case for report integrity sealing.",
    urgency: "routine",
  },
} as const;

const validReviewRequest = {
  reviewerName: "Dr. Elena Konkova",
  reviewerRole: "breast-imaging-radiologist",
  disposition: "confirmed",
  finalBiradsCategory: "2",
  finalSummary: "No suspicious findings on FFDM review; benign screening assessment.",
  reviewNotes: "Draft confirmed after radiologist review for integrity seal test.",
} as const;

async function createFinalizedCase(storePath: string) {
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
  assert.equal(reviewResponse.body.status, "Finalized");

  return { runtime, caseId: createResponse.body.caseId };
}

test("POST /api/v1/cases/:caseId/report/seal creates a SHA-256 integrity seal for a finalized report", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-seal-store-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const { runtime, caseId } = await createFinalizedCase(storePath);

    const sealResponse = await request(runtime.app)
      .post(`/api/v1/cases/${caseId}/report/seal`)
      .set("x-request-id", "req-seal-001")
      .send({ sealedBy: "Dr. Elena Konkova" });

    assert.equal(sealResponse.status, 201);
    assert.equal(sealResponse.body.caseId, caseId);
    assert.equal(sealResponse.body.integritySeal.algorithm, "SHA-256");
    assert.match(sealResponse.body.integritySeal.reportHash, /^[a-f0-9]{64}$/);
    assert.equal(sealResponse.body.integritySeal.sealedBy, "Dr. Elena Konkova");
    assert.equal(typeof sealResponse.body.integritySeal.sealedAt, "string");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("POST /api/v1/cases/:caseId/report/seal rejects double-sealing with 409", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-seal-conflict-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const { runtime, caseId } = await createFinalizedCase(storePath);

    const firstSeal = await request(runtime.app)
      .post(`/api/v1/cases/${caseId}/report/seal`)
      .send({ sealedBy: "Dr. Elena Konkova" });

    assert.equal(firstSeal.status, 201);

    const secondSeal = await request(runtime.app)
      .post(`/api/v1/cases/${caseId}/report/seal`)
      .send({ sealedBy: "Dr. Elena Konkova" });

    assert.equal(secondSeal.status, 409);
    assert.equal(secondSeal.body.error.code, "CASE_REPORT_SEAL_CONFLICT");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("POST /api/v1/cases/:caseId/report/seal rejects sealing a non-finalized case with 409", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-seal-not-ready-"));
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

    const sealResponse = await request(runtime.app)
      .post(`/api/v1/cases/${createResponse.body.caseId}/report/seal`)
      .send({ sealedBy: "Dr. Elena Konkova" });

    assert.equal(sealResponse.status, 409);
    assert.equal(sealResponse.body.error.code, "CASE_REPORT_SEAL_NOT_READY");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("POST /api/v1/cases/:caseId/report/seal returns 400 for invalid seal input", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-seal-invalid-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const { runtime, caseId } = await createFinalizedCase(storePath);

    const sealResponse = await request(runtime.app)
      .post(`/api/v1/cases/${caseId}/report/seal`)
      .send({});

    assert.equal(sealResponse.status, 400);
    assert.equal(sealResponse.body.error.code, "INVALID_REQUEST_BODY");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("POST /api/v1/cases/:caseId/report/seal returns 404 for unknown case", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const sealResponse = await request(runtime.app)
    .post("/api/v1/cases/00000000-0000-0000-0000-000000000000/report/seal")
    .send({ sealedBy: "Dr. Elena Konkova" });

  assert.equal(sealResponse.status, 404);
  assert.equal(sealResponse.body.error.code, "CASE_NOT_FOUND");
});

test("GET /api/v1/cases/:caseId/report/integrity verifies a sealed report's SHA-256 hash", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-integrity-verify-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const { runtime, caseId } = await createFinalizedCase(storePath);

    const sealResponse = await request(runtime.app)
      .post(`/api/v1/cases/${caseId}/report/seal`)
      .send({ sealedBy: "Dr. Elena Konkova" });

    assert.equal(sealResponse.status, 201);

    const integrityResponse = await request(runtime.app)
      .get(`/api/v1/cases/${caseId}/report/integrity`)
      .set("x-request-id", "req-integrity-001");

    assert.equal(integrityResponse.status, 200);
    assert.equal(integrityResponse.body.caseId, caseId);
    assert.equal(integrityResponse.body.verified, true);
    assert.equal(integrityResponse.body.currentHash, sealResponse.body.integritySeal.reportHash);
    assert.equal(integrityResponse.body.integritySeal.algorithm, "SHA-256");
    assert.equal(integrityResponse.body.integritySeal.reportHash, sealResponse.body.integritySeal.reportHash);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId/report/integrity rejects verification of unsealed report with 409", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-integrity-not-sealed-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const { runtime, caseId } = await createFinalizedCase(storePath);

    const integrityResponse = await request(runtime.app)
      .get(`/api/v1/cases/${caseId}/report/integrity`);

    assert.equal(integrityResponse.status, 409);
    assert.equal(integrityResponse.body.error.code, "CASE_REPORT_NOT_SEALED");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId/report/integrity returns 404 for unknown case", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const integrityResponse = await request(runtime.app)
    .get("/api/v1/cases/00000000-0000-0000-0000-000000000000/report/integrity");

  assert.equal(integrityResponse.status, 404);
  assert.equal(integrityResponse.body.error.code, "CASE_NOT_FOUND");
});

test("sealed report hash is deterministic and matches SHA-256 of the rendered report body", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-seal-deterministic-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const { runtime, caseId } = await createFinalizedCase(storePath);

    const reportResponse = await request(runtime.app)
      .get(`/api/v1/cases/${caseId}/report`);

    assert.equal(reportResponse.status, 200);

    const expectedHash = createHash("sha256")
      .update(reportResponse.body.report.body, "utf-8")
      .digest("hex");

    const sealResponse = await request(runtime.app)
      .post(`/api/v1/cases/${caseId}/report/seal`)
      .send({ sealedBy: "Dr. Elena Konkova" });

    assert.equal(sealResponse.status, 201);
    assert.equal(sealResponse.body.integritySeal.reportHash, expectedHash);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("report-integrity-sealed lifecycle event is persisted in case event history", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-seal-events-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const { runtime, caseId } = await createFinalizedCase(storePath);

    await request(runtime.app)
      .post(`/api/v1/cases/${caseId}/report/seal`)
      .set("x-request-id", "req-seal-events-001")
      .set("x-correlation-id", "corr-seal-events-001")
      .set("x-actor-id", "radiologist-003")
      .set("x-actor-role", "radiologist")
      .send({ sealedBy: "Dr. Elena Konkova" });

    const eventsResponse = await request(runtime.app)
      .get(`/api/v1/cases/${caseId}/events`);

    assert.equal(eventsResponse.status, 200);

    const sealEvent = eventsResponse.body.events.find(
      (event: { type: string }) => event.type === "mammography.report-integrity-sealed.v1",
    );

    assert.ok(sealEvent, "seal event must exist in the lifecycle event history");
    assert.equal(sealEvent.caseId, caseId);
    assert.equal(sealEvent.audit.requestId, "req-seal-events-001");
    assert.equal(sealEvent.audit.correlationId, "corr-seal-events-001");
    assert.equal(sealEvent.audit.actorId, "radiologist-003");
    assert.equal(sealEvent.audit.actorRole, "radiologist");
    assert.equal(sealEvent.payload.algorithm, "SHA-256");
    assert.match(sealEvent.payload.reportHash, /^[a-f0-9]{64}$/);
    assert.equal(sealEvent.payload.sealedBy, "Dr. Elena Konkova");
    assert.equal(typeof sealEvent.payload.sealedAt, "string");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("seal persists across restarts and integrity verification remains consistent", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-seal-persistence-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const { runtime: firstRuntime, caseId } = await createFinalizedCase(storePath);

    const sealResponse = await request(firstRuntime.app)
      .post(`/api/v1/cases/${caseId}/report/seal`)
      .send({ sealedBy: "Dr. Elena Konkova" });

    assert.equal(sealResponse.status, 201);

    const secondRuntime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const integrityResponse = await request(secondRuntime.app)
      .get(`/api/v1/cases/${caseId}/report/integrity`);

    assert.equal(integrityResponse.status, 200);
    assert.equal(integrityResponse.body.verified, true);
    assert.equal(integrityResponse.body.integritySeal.reportHash, sealResponse.body.integritySeal.reportHash);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
