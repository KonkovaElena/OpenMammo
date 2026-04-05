import type { CreateMammographyCaseRequest } from "../../domain/mammography/contracts";
import { MammographySecondOpinionCase } from "../../domain/mammography/MammographySecondOpinionCase";
import type {
  IMammographyDraftInferenceService,
  IMammographyExamQualityPolicy,
  IMammographySafetyPolicy,
  IMammographySecondOpinionCaseRepository,
} from "../../domain/mammography/ports";

export interface MammographySecondOpinionCaseResponse {
  caseId: string;
  status: string;
  assessment: {
    biradsCategory: string;
    summary: string;
    confidenceBand: string;
    outputMode: "draft-only";
  } | null;
  qc: {
    status: "pass" | "warning";
    findingCount: number;
    findings: Array<{
      code: string;
      severity: "info" | "warning";
      description: string;
    }>;
  } | null;
  safety: {
    flagCount: number;
    hasBlockingFlags: boolean;
  };
}

export type GenerateMammographySecondOpinionOutput = MammographySecondOpinionCaseResponse;

export class GenerateMammographySecondOpinionUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
    private readonly inferenceService: IMammographyDraftInferenceService,
    private readonly examQualityPolicy: IMammographyExamQualityPolicy,
    private readonly safetyPolicy: IMammographySafetyPolicy,
  ) {}

  async execute(
    input: CreateMammographyCaseRequest,
  ): Promise<GenerateMammographySecondOpinionOutput> {
    const mammographyCase = MammographySecondOpinionCase.submit(input.exam, input.clinicalQuestion);
    const qcResult = await this.examQualityPolicy.evaluate(input.exam);

    mammographyCase.applyExamQuality(qcResult.summary);

    const inferenceResult = await this.inferenceService.generateDraft(input.exam, input.clinicalQuestion);

    mammographyCase.completeDraft(
      inferenceResult.assessment,
      inferenceResult.modelId,
      inferenceResult.latencyMs,
    );

    const safetyResult = await this.safetyPolicy.evaluate(
      inferenceResult.assessment,
      input.exam,
      input.clinicalQuestion,
    );

    mammographyCase.applySafetyFlags(safetyResult.flags);
    await this.repository.save(mammographyCase);

    return mapMammographySecondOpinionCaseToResponse(mammographyCase);
  }
}

export function mapMammographySecondOpinionCaseToResponse(
  caseAggregate: MammographySecondOpinionCase,
): MammographySecondOpinionCaseResponse {
  return {
    caseId: caseAggregate.caseId,
    status: caseAggregate.status,
    assessment: caseAggregate.assessment
      ? {
          biradsCategory: caseAggregate.assessment.biradsCategory,
          summary: caseAggregate.assessment.summary,
          confidenceBand: caseAggregate.assessment.confidenceBand,
          outputMode: caseAggregate.assessment.outputMode,
        }
      : null,
    qc: caseAggregate.qc
      ? {
          status: caseAggregate.qc.status,
          findingCount: caseAggregate.qc.findingCount,
          findings: [...caseAggregate.qc.findings],
        }
      : null,
    safety: {
      flagCount: caseAggregate.safetyFlags.length,
      hasBlockingFlags: caseAggregate.hasBlockingFlags,
    },
  };
}