import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";
import type { MammographyReportIntegritySeal } from "../../domain/mammography/contracts";
import { MammographyCaseReportNotReadyError } from "./RenderMammographyCaseReportUseCase";

export interface MammographyReportSealInput {
  sealedBy: string;
}

export interface MammographyReportSealResponse {
  caseId: string;
  integritySeal: MammographyReportIntegritySeal;
}

export class MammographyCaseReportSealConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MammographyCaseReportSealConflictError";
  }
}

export class MammographyCaseReportSealNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MammographyCaseReportSealNotReadyError";
  }
}

export class SealMammographyCaseReportUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
    private readonly renderReportBody: (caseId: string) => Promise<string | null>,
  ) {}

  async execute(
    caseId: string,
    input: MammographyReportSealInput,
  ): Promise<MammographyReportSealResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    let reportBody: string | null;

    try {
      reportBody = await this.renderReportBody(caseId);
    } catch (error) {
      if (error instanceof MammographyCaseReportNotReadyError) {
        throw new MammographyCaseReportSealNotReadyError(error.message);
      }

      throw error;
    }

    if (!reportBody) {
      throw new MammographyCaseReportSealNotReadyError(
        `Mammography case '${caseId}' report is not available for sealing.`,
      );
    }

    try {
      caseAggregate.sealReport(reportBody, input.sealedBy);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Cannot seal report in state")) {
        throw new MammographyCaseReportSealNotReadyError(error.message);
      }

      if (error instanceof Error && error.message.startsWith("Report integrity seal already exists")) {
        throw new MammographyCaseReportSealConflictError(error.message);
      }

      throw error;
    }

    await this.repository.save(caseAggregate);

    return {
      caseId: caseAggregate.caseId,
      integritySeal: caseAggregate.integritySeal!,
    };
  }
}
