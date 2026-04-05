import type { DicomwebArchiveSeamConfig } from "../../domain/archive/DicomwebArchiveSeamConfig";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";

export interface MammographyDicomwebArchiveSeamResponse {
  caseId: string;
  study: {
    studyInstanceUid: string;
    accessionNumber: string | null;
    modality: "MG";
  };
  archive: DicomwebArchiveSeamConfig;
  workflow: {
    ohifReviewSeamPath: string;
    reviewReady: boolean;
  };
}

export class RenderDicomwebArchiveSeamUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
    private readonly archiveConfig: DicomwebArchiveSeamConfig,
  ) {}

  async execute(caseId: string): Promise<MammographyDicomwebArchiveSeamResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    return {
      caseId: caseAggregate.caseId,
      study: {
        studyInstanceUid: caseAggregate.exam.studyInstanceUid,
        accessionNumber: caseAggregate.exam.accessionNumber ?? null,
        modality: "MG",
      },
      archive: this.archiveConfig,
      workflow: {
        ohifReviewSeamPath: `/api/v1/cases/${caseAggregate.caseId}/review-seams/ohif`,
        reviewReady: caseAggregate.status !== "Submitted",
      },
    };
  }
}