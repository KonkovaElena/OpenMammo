import type {
  MammographyClinicalQuestion,
  MammographyDraftAssessment,
  MammographyExam,
  MammographyExamQualitySummary,
  MammographySafetyFlag,
} from "./contracts";
import type { MammographySecondOpinionCase } from "./MammographySecondOpinionCase";

export interface IMammographySecondOpinionCaseRepository {
  save(caseAggregate: MammographySecondOpinionCase): Promise<void>;
  getById(caseId: string): Promise<MammographySecondOpinionCase | null>;
  listAll(): Promise<MammographySecondOpinionCase[]>;
}

export interface IMammographyDraftInferenceService {
  generateDraft(
    exam: MammographyExam,
    clinicalQuestion: MammographyClinicalQuestion,
  ): Promise<{
    assessment: MammographyDraftAssessment;
    modelId: string;
    latencyMs: number;
  }>;
}

export interface IMammographyExamQualityPolicy {
  evaluate(exam: MammographyExam): Promise<{
    summary: MammographyExamQualitySummary;
  }>;
}

export interface IMammographySafetyPolicy {
  evaluate(
    assessment: MammographyDraftAssessment,
    exam: MammographyExam,
    clinicalQuestion: MammographyClinicalQuestion,
  ): Promise<{
    flags: MammographySafetyFlag[];
  }>;
}