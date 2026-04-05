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
    sourceName: "dicomweb";
    qidoRoot: null;
    wadoRoot: null;
    wadoUriRoot: null;
    ready: false;
  };
  workflow: {
    caseStatus: string;
    reviewReady: boolean;
  };
}

export class RenderOhifReviewSeamUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
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
        sourceName: "dicomweb",
        qidoRoot: null,
        wadoRoot: null,
        wadoUriRoot: null,
        ready: false,
      },
      workflow: {
        caseStatus: caseAggregate.status,
        reviewReady: caseAggregate.status !== "Submitted",
      },
    };
  }
}