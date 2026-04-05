import type {
  MammographyClinicalQuestion,
  MammographyDraftAssessment,
  MammographyExam,
  MammographySafetyFlag,
} from "./contracts";
import type { MammographySecondOpinionCase } from "./MammographySecondOpinionCase";

export interface IMammographySecondOpinionCaseRepository {
  save(caseAggregate: MammographySecondOpinionCase): Promise<void>;
  getById(caseId: string): Promise<MammographySecondOpinionCase | null>;
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

export interface IMammographySafetyPolicy {
  evaluate(
    assessment: MammographyDraftAssessment,
    exam: MammographyExam,
    clinicalQuestion: MammographyClinicalQuestion,
  ): Promise<{
    flags: MammographySafetyFlag[];
  }>;
}