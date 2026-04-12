import type { Registry } from "prom-client";
import type { Express } from "express";
import { createApp } from "./application/createApp";
import type { CaseIntakeRateLimitConfig } from "./application/CaseIntakeRateLimiter";
import { DeliverMammographyCaseReportUseCase } from "./application/usecases/DeliverMammographyCaseReportUseCase";
import { FinalizeMammographySecondOpinionReviewUseCase } from "./application/usecases/FinalizeMammographySecondOpinionReviewUseCase";
import { RenderDicomwebArchiveSeamUseCase } from "./application/usecases/RenderDicomwebArchiveSeamUseCase";
import { RenderOhifReviewSeamUseCase } from "./application/usecases/RenderOhifReviewSeamUseCase";
import { RenderMammographyCaseReportUseCase } from "./application/usecases/RenderMammographyCaseReportUseCase";
import { RenderPythonSidecarIntegrationSeamUseCase } from "./application/usecases/RenderPythonSidecarIntegrationSeamUseCase";
import { SealMammographyCaseReportUseCase } from "./application/usecases/SealMammographyCaseReportUseCase";
import { VerifyMammographyCaseReportIntegrityUseCase } from "./application/usecases/VerifyMammographyCaseReportIntegrityUseCase";
import { ListMammographyCasesUseCase } from "./application/usecases/ListMammographyCasesUseCase";
import { GetMammographySecondOpinionCaseUseCase } from "./application/usecases/GetMammographySecondOpinionCaseUseCase";
import { GetMammographySecondOpinionCaseEventsUseCase } from "./application/usecases/GetMammographySecondOpinionCaseEventsUseCase";
import { GenerateMammographySecondOpinionUseCase } from "./application/usecases/GenerateMammographySecondOpinionUseCase";
import { createDicomwebArchiveSeamConfig } from "./domain/archive/DicomwebArchiveSeamConfig";
import { standaloneManifest, type StandaloneManifest } from "./domain/manifest";
import { createStructuredLogger, type StructuredLogger } from "./logging";
import { createMonitoring } from "./monitoring";
import { FileBasedMammographySecondOpinionCaseRepository } from "./infrastructure/persistence/FileBasedMammographySecondOpinionCaseRepository";
import { MammographySecondOpinionCase } from "./domain/mammography/MammographySecondOpinionCase";
import type {
  IMammographyDraftInferenceService,
  IMammographyExamQualityPolicy,
  IMammographySafetyPolicy,
  IMammographySecondOpinionCaseRepository,
} from "./domain/mammography/ports";

export interface BootstrapOptions {
  metricsEnabled?: boolean;
  isShuttingDown?: () => boolean;
  logger?: StructuredLogger;
  startedAt?: Date;
  caseStorePath?: string;
  caseIntakeRateLimit?: CaseIntakeRateLimitConfig;
  orthancBaseUrl?: string;
  dicomwebSourceName?: string;
  pythonSidecarBaseUrl?: string;
}

export interface BootstrapResult {
  app: Express;
  manifest: StandaloneManifest;
  metricsRegistry: Registry;
}

export function bootstrap(options: BootstrapOptions = {}): BootstrapResult {
  const { metricsRegistry, requestCounter } = createMonitoring();
  const logger = options.logger ?? createStructuredLogger();
  const startedAt = options.startedAt ?? new Date();
  const archiveConfig = createDicomwebArchiveSeamConfig({
    orthancBaseUrl: options.orthancBaseUrl,
    sourceName: options.dicomwebSourceName,
  });

  const repository = createCaseRepository(options.caseStorePath);
  const inferenceService = createBaselineInferenceService();
  const examQualityPolicy = createBaselineExamQualityPolicy();
  const safetyPolicy = createBaselineSafetyPolicy();
  const generateCaseUseCase = new GenerateMammographySecondOpinionUseCase(
    repository,
    inferenceService,
    examQualityPolicy,
    safetyPolicy,
  );
  const getCaseUseCase = new GetMammographySecondOpinionCaseUseCase(repository);
  const getCaseEventsUseCase = new GetMammographySecondOpinionCaseEventsUseCase(repository);
  const finalizeReviewUseCase = new FinalizeMammographySecondOpinionReviewUseCase(repository);
  const renderReportUseCase = new RenderMammographyCaseReportUseCase(repository);
  const deliverReportUseCase = new DeliverMammographyCaseReportUseCase(repository);
  const renderOhifReviewSeamUseCase = new RenderOhifReviewSeamUseCase(repository, archiveConfig);
  const renderDicomwebArchiveSeamUseCase = new RenderDicomwebArchiveSeamUseCase(repository, archiveConfig);
  const renderPythonSidecarIntegrationSeamUseCase = new RenderPythonSidecarIntegrationSeamUseCase(
    options.pythonSidecarBaseUrl,
  );

  const renderReportBodyForSeal = async (caseId: string): Promise<string | null> => {
    const rendered = await renderReportUseCase.execute(caseId);
    return rendered ? rendered.report.body : null;
  };

  const sealReportUseCase = new SealMammographyCaseReportUseCase(repository, renderReportBodyForSeal);
  const verifyReportIntegrityUseCase = new VerifyMammographyCaseReportIntegrityUseCase(repository, renderReportBodyForSeal);
  const listCasesUseCase = new ListMammographyCasesUseCase(repository);

  const app = createApp({
    metricsEnabled: options.metricsEnabled ?? true,
    metricsRegistry,
    requestCounter,
    startedAt,
    logger,
    isShuttingDown: options.isShuttingDown ?? (() => false),
    caseIntakeRateLimit: options.caseIntakeRateLimit,
    generateCase: (input) => generateCaseUseCase.execute(input),
    getCaseById: (caseId) => getCaseUseCase.execute(caseId),
    getCaseEventsById: (caseId) => getCaseEventsUseCase.execute(caseId),
    finalizeCaseReview: (caseId, reviewInput) => finalizeReviewUseCase.execute(caseId, reviewInput),
    renderCaseReport: (caseId) => renderReportUseCase.execute(caseId),
    deliverCaseReport: (caseId, deliveryInput) => deliverReportUseCase.execute(caseId, deliveryInput),
    renderOhifReviewSeam: (caseId) => renderOhifReviewSeamUseCase.execute(caseId),
    renderDicomwebArchiveSeam: (caseId) => renderDicomwebArchiveSeamUseCase.execute(caseId),
    renderPythonSidecarIntegrationSeam: () => renderPythonSidecarIntegrationSeamUseCase.execute(),
    sealCaseReport: (caseId, sealInput) => sealReportUseCase.execute(caseId, sealInput),
    verifyCaseReportIntegrity: (caseId) => verifyReportIntegrityUseCase.execute(caseId),
    listCases: (input) => listCasesUseCase.execute(input),
  });

  return {
    app,
    manifest: standaloneManifest,
    metricsRegistry,
  };
}

function createCaseRepository(caseStorePath?: string): IMammographySecondOpinionCaseRepository {
  if (caseStorePath) {
    return new FileBasedMammographySecondOpinionCaseRepository(caseStorePath);
  }

  return createInMemoryRepository();
}

function createInMemoryRepository(): IMammographySecondOpinionCaseRepository {
  const records = new Map<string, ReturnType<MammographySecondOpinionCase["toSnapshot"]>>();

  return {
    async save(caseAggregate) {
      records.set(caseAggregate.caseId, caseAggregate.toSnapshot());
    },

    async getById(caseId) {
      const snapshot = records.get(caseId);
      return snapshot ? MammographySecondOpinionCase.rehydrate(snapshot) : null;
    },

    async listAll() {
      return Array.from(records.values()).map((snapshot) =>
        MammographySecondOpinionCase.rehydrate(snapshot),
      );
    },
  };
}

function createBaselineInferenceService(): IMammographyDraftInferenceService {
  return {
    async generateDraft(exam, clinicalQuestion) {
      const densityText = exam.breastDensity ? ` Density category ${exam.breastDensity}.` : "";

      return {
        assessment: {
          summary: `Baseline draft for FFDM case: ${clinicalQuestion.questionText}${densityText}`,
          biradsCategory: "0",
          confidenceBand: "moderate",
          outputMode: "draft-only",
          findings: [
            "Four standard FFDM views are present for clinician review.",
            "Draft generated by baseline rule engine and must not bypass radiologist interpretation.",
          ],
          recommendations: [
            "Radiologist review is required before finalization.",
          ],
        },
        modelId: "baseline-rule-engine:v0",
        latencyMs: 0,
      };
    },
  };
}

function createBaselineExamQualityPolicy(): IMammographyExamQualityPolicy {
  return {
    async evaluate(exam) {
      const findings = [];

      if (!exam.accessionNumber) {
        findings.push({
          code: "MISSING_ACCESSION_NUMBER",
          severity: "warning" as const,
          description: "Accession number is absent; downstream archive reconciliation may require manual confirmation.",
        });
      }

      if (typeof exam.patientAge !== "number") {
        findings.push({
          code: "MISSING_PATIENT_AGE",
          severity: "warning" as const,
          description: "Patient age is absent; age-aware clinician review context is incomplete.",
        });
      }

      if (!exam.breastDensity) {
        findings.push({
          code: "MISSING_BREAST_DENSITY",
          severity: "warning" as const,
          description: "Breast density is absent; density-aware mammography review context is incomplete.",
        });
      }

      return {
        summary: {
          status: findings.length > 0 ? "warning" : "pass",
          findingCount: findings.length,
          findings,
        },
      };
    },
  };
}

function createBaselineSafetyPolicy(): IMammographySafetyPolicy {
  return {
    async evaluate() {
      return { flags: [] };
    },
  };
}