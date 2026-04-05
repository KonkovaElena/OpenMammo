import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";
import { MammographySecondOpinionCase } from "../src/domain/mammography/MammographySecondOpinionCase";
import {
  type MammographyClinicalQuestion,
  type MammographyDraftAssessment,
  type MammographyExam,
} from "../src/domain/mammography/contracts";
import { FileBasedMammographySecondOpinionCaseRepository } from "../src/infrastructure/persistence/FileBasedMammographySecondOpinionCaseRepository";

const validExam: MammographyExam = {
  studyInstanceUid: "1.2.840.10008.1.2.3.40",
  modality: "FFDM",
  standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
  patientAge: 57,
  breastDensity: "C",
  accessionNumber: "ACC-PERSIST-001",
};

const validClinicalQuestion: MammographyClinicalQuestion = {
  questionText: "Persist this draft-only FFDM second opinion for later clinician review.",
  urgency: "routine",
};

const validAssessment: MammographyDraftAssessment = {
  summary: "Persisted draft-only FFDM assessment.",
  biradsCategory: "0",
  confidenceBand: "moderate",
  outputMode: "draft-only",
  findings: ["Four standard FFDM views available for clinician review."],
  recommendations: ["Radiologist review required before finalization."],
};

test("file-backed repository reloads a persisted mammography case across instances", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-persistence-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const caseAggregate = MammographySecondOpinionCase.submit(validExam, validClinicalQuestion);
    caseAggregate.applyExamQuality({
      status: "pass",
      findingCount: 0,
      findings: [],
    });
    caseAggregate.completeDraft(validAssessment, "baseline-rule-engine:v0", 12);
    caseAggregate.applySafetyFlags([
      {
        code: "PERSISTENCE_SMOKE",
        severity: "info",
        description: "Synthetic flag for repository round-trip verification.",
        blocksReview: false,
      },
    ]);

    const firstRepository = new FileBasedMammographySecondOpinionCaseRepository(storePath);
    await firstRepository.save(caseAggregate);

    const secondRepository = new FileBasedMammographySecondOpinionCaseRepository(storePath);
    const reloadedCase = await secondRepository.getById(caseAggregate.caseId);

    assert.ok(reloadedCase);
    assert.equal(reloadedCase?.caseId, caseAggregate.caseId);
    assert.equal(reloadedCase?.status, "AwaitingReview");
    assert.equal(reloadedCase?.assessment?.summary, validAssessment.summary);
    assert.equal(reloadedCase?.qc?.status, "pass");
    assert.equal(reloadedCase?.safetyFlags.length, 1);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId returns the persisted case after a bootstrap restart", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-bootstrap-store-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const firstBootstrap = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const createResponse = await request(firstBootstrap.app)
      .post("/api/v1/cases")
      .send({
        exam: validExam,
        clinicalQuestion: validClinicalQuestion,
      });

    assert.equal(createResponse.status, 201);

    const secondBootstrap = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const readResponse = await request(secondBootstrap.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}`)
      .set("x-request-id", "req-persist-001");

    assert.equal(readResponse.status, 200);
    assert.equal(readResponse.body.caseId, createResponse.body.caseId);
    assert.equal(readResponse.body.status, "AwaitingReview");
    assert.equal(readResponse.body.assessment.outputMode, "draft-only");
    assert.equal(readResponse.body.qc.status, "pass");
    assert.equal(readResponse.body.safety.hasBlockingFlags, false);

    const missingResponse = await request(secondBootstrap.app)
      .get("/api/v1/cases/00000000-0000-0000-0000-000000000000")
      .set("x-request-id", "req-persist-404");

    assert.equal(missingResponse.status, 404);
    assert.equal(missingResponse.body.error.code, "CASE_NOT_FOUND");
    assert.equal(missingResponse.body.error.requestId, "req-persist-404");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId returns submitted cases without forcing a 500", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-submitted-store-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const repository = new FileBasedMammographySecondOpinionCaseRepository(storePath);
    const submittedCase = MammographySecondOpinionCase.submit(validExam, validClinicalQuestion);
    await repository.save(submittedCase);

    const runtime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const response = await request(runtime.app)
      .get(`/api/v1/cases/${submittedCase.caseId}`)
      .set("x-request-id", "req-submitted-001");

    assert.equal(response.status, 200);
    assert.equal(response.body.caseId, submittedCase.caseId);
    assert.equal(response.body.status, "Submitted");
    assert.equal(response.body.assessment, null);
    assert.equal(response.body.qc, null);
    assert.equal(response.body.safety.flagCount, 0);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/v1/cases/:caseId/events returns persisted lifecycle events after restart", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-events-store-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const firstBootstrap = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const createResponse = await request(firstBootstrap.app)
      .post("/api/v1/cases")
      .send({
        exam: validExam,
        clinicalQuestion: validClinicalQuestion,
      });

    assert.equal(createResponse.status, 201);

    const secondBootstrap = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const response = await request(secondBootstrap.app)
      .get(`/api/v1/cases/${createResponse.body.caseId}/events`)
      .set("x-request-id", "req-events-001");

    assert.equal(response.status, 200);
    assert.equal(response.body.caseId, createResponse.body.caseId);
    assert.equal(response.body.count, 4);
    assert.deepEqual(
      response.body.events.map((event: { type: string }) => event.type),
      [
        "mammography.case-submitted.v1",
        "mammography.exam-qc-evaluated.v1",
        "mammography.draft-generated.v1",
        "mammography.safety-flags-applied.v1",
      ],
    );
    assert.equal(response.body.events[1].payload.status, "pass");
    assert.equal(response.body.events[1].payload.findingCount, 0);
    assert.equal(response.body.events[3].payload.flagCount, 0);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("file-backed repository serializes concurrent saves on one instance", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-concurrent-store-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const repository = new FileBasedMammographySecondOpinionCaseRepository(storePath);
    const caseA = MammographySecondOpinionCase.submit(validExam, validClinicalQuestion);
    const caseB = MammographySecondOpinionCase.submit(
      {
        ...validExam,
        studyInstanceUid: "1.2.840.10008.1.2.3.41",
        accessionNumber: "ACC-PERSIST-002",
      },
      {
        ...validClinicalQuestion,
        questionText: "Persist a second concurrent FFDM case.",
      },
    );

    await Promise.all([repository.save(caseA), repository.save(caseB)]);

    const reloadedRepository = new FileBasedMammographySecondOpinionCaseRepository(storePath);
    const reloadedCaseA = await reloadedRepository.getById(caseA.caseId);
    const reloadedCaseB = await reloadedRepository.getById(caseB.caseId);

    assert.ok(reloadedCaseA);
    assert.ok(reloadedCaseB);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});