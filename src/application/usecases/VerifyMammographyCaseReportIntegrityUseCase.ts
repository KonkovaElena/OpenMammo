import { createHash } from "node:crypto";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";
import type { MammographyReportIntegritySeal } from "../../domain/mammography/contracts";

export interface MammographyReportIntegrityResponse {
  caseId: string;
  verified: boolean;
  currentHash: string;
  integritySeal: MammographyReportIntegritySeal;
}

export class MammographyCaseReportNotSealedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MammographyCaseReportNotSealedError";
  }
}

export class VerifyMammographyCaseReportIntegrityUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
    private readonly renderReportBody: (caseId: string) => Promise<string | null>,
  ) {}

  async execute(caseId: string): Promise<MammographyReportIntegrityResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    if (!caseAggregate.integritySeal) {
      throw new MammographyCaseReportNotSealedError(
        `Mammography case '${caseId}' report has not been sealed.`,
      );
    }

    const reportBody = await this.renderReportBody(caseId);

    if (!reportBody) {
      throw new MammographyCaseReportNotSealedError(
        `Mammography case '${caseId}' report is not available for verification.`,
      );
    }

    const currentHash = createHash("sha256").update(reportBody, "utf-8").digest("hex");
    const verified = currentHash === caseAggregate.integritySeal.reportHash;

    return {
      caseId: caseAggregate.caseId,
      verified,
      currentHash,
      integritySeal: caseAggregate.integritySeal,
    };
  }
}
