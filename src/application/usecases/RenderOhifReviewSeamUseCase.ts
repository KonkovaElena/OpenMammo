import type { DicomwebArchiveSeamConfig } from "../../domain/archive/DicomwebArchiveSeamConfig";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";

export interface MammographyOhifReviewSeamResponse {
  caseId: string;
  viewer: {
    vendor: "OHIF";
    viewerPath: "/viewer";
    query: {
      StudyInstanceUIDs: string[];
      modalities: "MG";
    };
  };
  dataSource: {
    namespace: "dicomweb";
    sourceName: string;
    qidoRoot: string | null;
    wadoRoot: string | null;
    wadoUriRoot: string | null;
    ready: boolean;
  };
  workflow: {
    caseStatus: string;
    reviewReady: boolean;
  };
}

export class RenderOhifReviewSeamUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
    private readonly archiveConfig: DicomwebArchiveSeamConfig,
  ) {}

  async execute(caseId: string): Promise<MammographyOhifReviewSeamResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    return {
      caseId: caseAggregate.caseId,
      viewer: {
        vendor: "OHIF",
        viewerPath: "/viewer",
        query: {
          StudyInstanceUIDs: [caseAggregate.exam.studyInstanceUid],
          modalities: "MG",
        },
      },
      dataSource: {
        namespace: "dicomweb",
        sourceName: this.archiveConfig.sourceName,
        qidoRoot: this.archiveConfig.qidoRoot,
        wadoRoot: this.archiveConfig.wadoRoot,
        wadoUriRoot: this.archiveConfig.wadoUriRoot,
        ready: this.archiveConfig.ready,
      },
      workflow: {
        caseStatus: caseAggregate.status,
        reviewReady: caseAggregate.status !== "Submitted",
      },
    };
  }
}