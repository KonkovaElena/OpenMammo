import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";

export interface MammographyRenderedReportResponse {
  caseId: string;
  status: string;
  report: {
    format: "text/plain";
    filename: string;
    renderedAt: string;
    body: string;
  };
}

export class MammographyCaseReportNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MammographyCaseReportNotReadyError";
  }
}

export class RenderMammographyCaseReportUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
  ) {}

  async execute(caseId: string): Promise<MammographyRenderedReportResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    if (!caseAggregate.review || caseAggregate.status !== "Finalized") {
      throw new MammographyCaseReportNotReadyError(
        `Mammography case '${caseId}' is not finalized for report rendering.`,
      );
    }

    const renderedAt = new Date().toISOString();

    return {
      caseId: caseAggregate.caseId,
      status: caseAggregate.status,
      report: {
        format: "text/plain",
        filename: `${caseAggregate.caseId}.txt`,
        renderedAt,
        body: [
          "Mammography Second Opinion Report",
          `Case ID: ${caseAggregate.caseId}`,
          `Reviewer: ${caseAggregate.review.reviewerName}`,
          `Reviewer Role: ${caseAggregate.review.reviewerRole}`,
          `Disposition: ${caseAggregate.review.disposition}`,
          `BI-RADS: ${caseAggregate.review.finalBiradsCategory}`,
          `Final Summary: ${caseAggregate.review.finalSummary}`,
          `Review Notes: ${caseAggregate.review.reviewNotes}`,
          `Finalized At: ${caseAggregate.review.finalizedAt}`,
          "Safety: clinician finalization required before delivery.",
        ].join("\n"),
      },
    };
  }
}