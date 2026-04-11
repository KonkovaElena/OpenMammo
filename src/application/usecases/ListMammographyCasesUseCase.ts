import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";
import type { MammographyCaseStatus } from "../../domain/mammography/MammographySecondOpinionCase";

export interface MammographyCaseSummary {
  caseId: string;
  status: MammographyCaseStatus;
  modality: string;
  studyInstanceUid: string;
  createdAt: string | null;
  assessmentSummary: string | null;
}

export interface ListMammographyCasesInput {
  limit: number;
  offset: number;
}

export interface ListMammographyCasesOutput {
  cases: MammographyCaseSummary[];
  total: number;
  limit: number;
  offset: number;
}

export class ListMammographyCasesUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
  ) {}

  async execute(input: ListMammographyCasesInput): Promise<ListMammographyCasesOutput> {
    const allCases = await this.repository.listAll();
    const total = allCases.length;
    const sliced = allCases.slice(input.offset, input.offset + input.limit);

    const cases: MammographyCaseSummary[] = sliced.map((caseAggregate) => {
      const firstEvent = caseAggregate.events[0];

      return {
        caseId: caseAggregate.caseId,
        status: caseAggregate.status,
        modality: caseAggregate.exam.modality,
        studyInstanceUid: caseAggregate.exam.studyInstanceUid,
        createdAt: firstEvent ? firstEvent.occurredAt : null,
        assessmentSummary: caseAggregate.assessment?.summary ?? null,
      };
    });

    return {
      cases,
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }
}
