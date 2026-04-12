# Environment Contract

Date: 2026-04-05

## Variables

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `NODE_ENV` | no | `development` | Runtime mode for the standalone process. |
| `HOST` | no | `0.0.0.0` | HTTP bind address for the standalone process. |
| `PORT` | no | `4030` | HTTP listen port for the control plane. |
| `CASE_STORE_PATH` | no | `artifacts/cases/mammography-second-opinion-cases.json` under the current working directory | File-backed persistence path for stored draft mammography cases. |
| `CASE_INTAKE_RATE_LIMIT_WINDOW_MS` | no | `60000` | Rolling window size in milliseconds for the in-memory per-IP case intake limiter. |
| `CASE_INTAKE_RATE_LIMIT_MAX_REQUESTS` | no | `30` | Maximum case-intake requests per client IP within one window. Set to `0` to disable the limiter. |
| `ORTHANC_BASE_URL` | no | unset | Base URL of an Orthanc HTTP server; when set, the standalone derives DICOMweb and WADO-URI roots for archive and OHIF handoff seams. |
| `DICOMWEB_SOURCE_NAME` | no | `dicomweb` | Source name emitted in OHIF and archive seam manifests for the DICOMweb datasource. |
| `PYTHON_SIDECAR_BASE_URL` | no | unset | Base URL of the optional FastAPI sidecar; when set, the standalone probes sidecar health, readiness, manifest, and capabilities via the integration seam route. |
| `METRICS_ENABLED` | no | `true` | Enables or disables the `/metrics` endpoint. |

## Current Behavior

- `NODE_ENV` accepts `development`, `test`, or `production`.
- `HOST` defaults to `0.0.0.0` so local containers and CI smoke jobs can reach the server reliably.
- `PORT` must parse as a positive integer.
- `CASE_STORE_PATH` controls where the standalone persists and reloads draft-only mammography cases.
- `CASE_INTAKE_RATE_LIMIT_WINDOW_MS` and `CASE_INTAKE_RATE_LIMIT_MAX_REQUESTS` bound the in-memory per-IP limiter that protects `POST /api/v1/cases` from obvious staging-grade abuse bursts.
- `ORTHANC_BASE_URL` is normalized to derive `.../dicom-web` for QIDO/WADO-RS and `.../wado` for WADO-URI in the archive-compatible handoff routes.
- `DICOMWEB_SOURCE_NAME` lets operators align the emitted seam manifests with the configured OHIF datasource name.
- `PYTHON_SIDECAR_BASE_URL` enables a live handshake probe against the sidecar scaffold endpoints without implying that imaging inference jobs are implemented.
- `METRICS_ENABLED=false` disables the metrics route and returns `404` from `/metrics`.

## Rate Limit Notes

- The case-intake limiter is intentionally in-memory and per-process, matching the current standalone maturity level and file-backed persistence seam.
- It is suitable for local development, single-instance staging, and basic public-export hardening, but it is not a distributed rate-limiting control plane.
- When the limiter is exceeded, `POST /api/v1/cases` returns `429` with a `Retry-After` header and a request-aware error envelope.

## Safety Boundary

No environment variable currently enables autonomous diagnosis, modality widening, or clinical-output mode changes. Scope and safety stay fixed in `src/domain/manifest.ts` until explicitly redesigned.