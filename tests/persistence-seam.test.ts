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