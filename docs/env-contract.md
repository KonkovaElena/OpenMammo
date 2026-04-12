# Environment Contract

Date: 2026-04-05

## Variables

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `NODE_ENV` | no | `development` | Runtime mode for the standalone process. |
| `HOST` | no | `0.0.0.0` | HTTP bind address for the standalone process. |
| `PORT` | no | `4030` | HTTP listen port for the control plane. |
| `AUTH_BEARER_TOKEN` | no | unset | Optional shared Bearer token that protects `/api/v1/cases` and all nested case routes when configured. |
| `AUTH_BEARER_ACTOR_ID` | no | unset | Trusted actor identifier written into audit metadata for authenticated protected-route requests. Required when `AUTH_BEARER_TOKEN` is set. |
| `AUTH_BEARER_ACTOR_ROLE` | no | unset | Trusted actor role written into audit metadata for authenticated protected-route requests. Required when `AUTH_BEARER_TOKEN` is set. |
| `CASE_STORE_BACKEND` | no | `file` | Persistence backend selection: `memory`, `file`, or `sqlite`. |
| `CASE_STORE_PATH` | no | `artifacts/cases/mammography-second-opinion-cases.json` for `file`; `artifacts/cases/mammography-second-opinion-cases.sqlite` for `sqlite` | Persistence path used by the selected non-memory backend. |
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
- `AUTH_BEARER_TOKEN` enables an opt-in static Bearer boundary for `/api/v1/cases` and every nested case route.
- `AUTH_BEARER_ACTOR_ID` and `AUTH_BEARER_ACTOR_ROLE` become the trusted actor identity persisted into lifecycle event audit metadata when bearer auth is enabled.
- When bearer auth is enabled, caller-supplied `x-actor-id` and `x-actor-role` headers are ignored for protected case routes.
- `CASE_STORE_BACKEND=file` keeps the JSON snapshot seam, `CASE_STORE_BACKEND=sqlite` enables the built-in Node SQLite-backed seam, and `CASE_STORE_BACKEND=memory` keeps the ephemeral test-friendly seam.
- `CASE_STORE_PATH` controls where the selected file or SQLite backend persists and reloads draft-only mammography cases.
- `CASE_INTAKE_RATE_LIMIT_WINDOW_MS` and `CASE_INTAKE_RATE_LIMIT_MAX_REQUESTS` bound the in-memory per-IP limiter that protects `POST /api/v1/cases` from obvious staging-grade abuse bursts.
- `ORTHANC_BASE_URL` is normalized to derive `.../dicom-web` for QIDO/WADO-RS and `.../wado` for WADO-URI in the archive-compatible handoff routes.
- `DICOMWEB_SOURCE_NAME` lets operators align the emitted seam manifests with the configured OHIF datasource name.
- `PYTHON_SIDECAR_BASE_URL` enables a live handshake probe against the sidecar scaffold endpoints without implying that imaging inference jobs are implemented.
- `METRICS_ENABLED=false` disables the metrics route and returns `404` from `/metrics`.

## Rate Limit Notes

- The case-intake limiter is intentionally in-memory and per-process, matching the current standalone maturity level and file-backed persistence seam.
- The SQLite backend currently uses Node's built-in `node:sqlite` module. This avoids a new npm dependency, but the module is still marked experimental by Node and should be treated as an opt-in durability step rather than the final production persistence architecture.
- It is suitable for local development, single-instance staging, and basic public-export hardening, but it is not a distributed rate-limiting control plane.
- When the limiter is exceeded, `POST /api/v1/cases` returns `429` with a `Retry-After` header and a request-aware error envelope.
- When bearer auth is enabled and a protected case route is called without valid credentials, the API responds with a Bearer `WWW-Authenticate` challenge and a request-aware `401` or `400` error envelope.

## Safety Boundary

No environment variable currently enables autonomous diagnosis, modality widening, or clinical-output mode changes. Scope and safety stay fixed in `src/domain/manifest.ts` until explicitly redesigned.

The bearer token settings add only a small machine-to-machine protection boundary. They do not yet provide user identity, token rotation, delegated scopes, or a full authorization service.