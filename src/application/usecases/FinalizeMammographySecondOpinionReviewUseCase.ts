import type { MammographyCaseReviewInput } from "../../domain/mammography/contracts";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";
import {
  mapMammographySecondOpinionCaseToResponse,
  type MammographySecondOpinionCaseResponse,
} from "./GenerateMammographySecondOpinionUseCase";

export class MammographyCaseReviewConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MammographyCaseReviewConflictError";
  }
}

export class FinalizeMammographySecondOpinionReviewUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
  ) {}

  async execute(
    caseId: string,
    reviewInput: MammographyCaseReviewInput,
  ): Promise<MammographySecondOpinionCaseResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    try {
      caseAggregate.finalizeReview(reviewInput);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Cannot finalize review in state")) {
        throw new MammographyCaseReviewConflictError(error.message);
      }

      throw error;
    }

    await this.repository.save(caseAggregate);
    return mapMammographySecondOpinionCaseToResponse(caseAggregate);
  }
}