import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";
import {
  mapMammographySecondOpinionCaseToResponse,
  type MammographySecondOpinionCaseResponse,
} from "./GenerateMammographySecondOpinionUseCase";

export class GetMammographySecondOpinionCaseUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
  ) {}

  async execute(caseId: string): Promise<MammographySecondOpinionCaseResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    return mapMammographySecondOpinionCaseToResponse(caseAggregate);
  }
}