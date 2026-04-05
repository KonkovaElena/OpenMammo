export interface DicomwebArchiveSeamConfig {
  vendor: "Orthanc";
  sourceName: string;
  dicomwebRoot: string | null;
  qidoRoot: string | null;
  wadoRoot: string | null;
  wadoUriRoot: string | null;
  ready: boolean;
}

export interface CreateDicomwebArchiveSeamConfigOptions {
  orthancBaseUrl?: string;
  sourceName?: string;
}

export function createDicomwebArchiveSeamConfig(
  options: CreateDicomwebArchiveSeamConfigOptions = {},
): DicomwebArchiveSeamConfig {
  const sourceName = options.sourceName ?? "dicomweb";
  const normalizedBaseUrl = normalizeBaseUrl(options.orthancBaseUrl);

  if (!normalizedBaseUrl) {
    return {
      vendor: "Orthanc",
      sourceName,
      dicomwebRoot: null,
      qidoRoot: null,
      wadoRoot: null,
      wadoUriRoot: null,
      ready: false,
    };
  }

  const dicomwebRoot = `${normalizedBaseUrl}/dicom-web`;

  return {
    vendor: "Orthanc",
    sourceName,
    dicomwebRoot,
    qidoRoot: dicomwebRoot,
    wadoRoot: dicomwebRoot,
    wadoUriRoot: `${normalizedBaseUrl}/wado`,
    ready: true,
  };
}

function normalizeBaseUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) {
    return undefined;
  }

  return baseUrl.replace(/\/+$/, "");
}