export interface PythonSidecarIntegrationSeamResponse {
  sidecar: {
    baseUrl: string | null;
    configured: boolean;
    reachable: boolean;
  };
  health: {
    status: string | null;
    mode: string | null;
  };
  readiness: {
    status: string | null;
    acceptingJobs: boolean | null;
  };
  manifest: {
    productName: string | null;
    outputShape: string | null;
    outputMode: string | null;
  };
  capabilities: {
    mode: string | null;
    implementedTasks: string[];
    plannedTasks: string[];
    docs: string[];
  };
}

const SIDEcar_TIMEOUT_MS = 1500;

export class RenderPythonSidecarIntegrationSeamUseCase {
  private readonly normalizedBaseUrl: string | null;

  constructor(baseUrl?: string) {
    this.normalizedBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : null;
  }

  async execute(): Promise<PythonSidecarIntegrationSeamResponse> {
    if (!this.normalizedBaseUrl) {
      return createEmptyResponse(null, false, false);
    }

    try {
      const [health, readiness, manifest, capabilities] = await Promise.all([
        fetchJson<HealthResponse>(`${this.normalizedBaseUrl}/healthz`),
        fetchJson<ReadinessResponse>(`${this.normalizedBaseUrl}/readyz`),
        fetchJson<ManifestResponse>(`${this.normalizedBaseUrl}/api/v1/manifest`),
        fetchJson<CapabilitiesResponse>(`${this.normalizedBaseUrl}/api/v1/capabilities`),
      ]);

      return {
        sidecar: {
          baseUrl: this.normalizedBaseUrl,
          configured: true,
          reachable: true,
        },
        health: {
          status: health.status ?? null,
          mode: toNullableString(health.runtime?.mode),
        },
        readiness: {
          status: readiness.status ?? null,
          acceptingJobs: toNullableBoolean(readiness.runtime?.acceptingJobs),
        },
        manifest: {
          productName: toNullableString(manifest.product?.name),
          outputShape: toNullableString(manifest.scope?.outputShape),
          outputMode: toNullableString(manifest.safety?.outputMode),
        },
        capabilities: {
          mode: toNullableString(capabilities.mode),
          implementedTasks: toStringArray(capabilities.implementedTasks),
          plannedTasks: toStringArray(capabilities.plannedTasks),
          docs: toStringArray(capabilities.docs),
        },
      };
    } catch {
      return createEmptyResponse(this.normalizedBaseUrl, true, false);
    }
  }
}

interface HealthResponse {
  status?: string;
  runtime?: {
    mode?: string;
  };
}

interface ReadinessResponse {
  status?: string;
  runtime?: {
    acceptingJobs?: boolean;
  };
}

interface ManifestResponse {
  product?: {
    name?: string;
  };
  scope?: {
    outputShape?: string;
  };
  safety?: {
    outputMode?: string;
  };
}

interface CapabilitiesResponse {
  mode?: string;
  implementedTasks?: unknown;
  plannedTasks?: unknown;
  docs?: unknown;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    signal: AbortSignal.timeout(SIDEcar_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Sidecar probe failed for ${url} with status ${String(response.status)}.`);
  }

  return (await response.json()) as T;
}

function createEmptyResponse(
  baseUrl: string | null,
  configured: boolean,
  reachable: boolean,
): PythonSidecarIntegrationSeamResponse {
  return {
    sidecar: {
      baseUrl,
      configured,
      reachable,
    },
    health: {
      status: null,
      mode: null,
    },
    readiness: {
      status: null,
      acceptingJobs: null,
    },
    manifest: {
      productName: null,
      outputShape: null,
      outputMode: null,
    },
    capabilities: {
      mode: null,
      implementedTasks: [],
      plannedTasks: [],
      docs: [],
    },
  };
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}