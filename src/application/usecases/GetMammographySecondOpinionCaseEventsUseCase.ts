import type { MammographyCaseLifecycleEvent } from "../../domain/mammography/contracts";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";

export interface MammographySecondOpinionCaseEventsResponse {
  caseId: string;
  count: number;
  events: MammographyCaseLifecycleEvent[];
}

export class GetMammographySecondOpinionCaseEventsUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
  ) {}

  async execute(caseId: string): Promise<MammographySecondOpinionCaseEventsResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    return {
      caseId: caseAggregate.caseId,
      count: caseAggregate.events.length,
      events: [...caseAggregate.events],
    };
  }
}