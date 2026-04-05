# Environment Contract

Date: 2026-04-05

## Variables

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `NODE_ENV` | no | `development` | Runtime mode for the standalone process. |
| `HOST` | no | `0.0.0.0` | HTTP bind address for the standalone process. |
| `PORT` | no | `4030` | HTTP listen port for the control plane. |
| `CASE_STORE_PATH` | no | `artifacts/cases/mammography-second-opinion-cases.json` under the current working directory | File-backed persistence path for stored draft mammography cases. |
| `ORTHANC_BASE_URL` | no | unset | Base URL of an Orthanc HTTP server; when set, the standalone derives DICOMweb and WADO-URI roots for archive and OHIF handoff seams. |
| `DICOMWEB_SOURCE_NAME` | no | `dicomweb` | Source name emitted in OHIF and archive seam manifests for the DICOMweb datasource. |
| `METRICS_ENABLED` | no | `true` | Enables or disables the `/metrics` endpoint. |

## Current Behavior

- `NODE_ENV` accepts `development`, `test`, or `production`.
- `HOST` defaults to `0.0.0.0` so local containers and CI smoke jobs can reach the server reliably.
- `PORT` must parse as a positive integer.
- `CASE_STORE_PATH` controls where the standalone persists and reloads draft-only mammography cases.
- `ORTHANC_BASE_URL` is normalized to derive `.../dicom-web` for QIDO/WADO-RS and `.../wado` for WADO-URI in the archive-compatible handoff routes.
- `DICOMWEB_SOURCE_NAME` lets operators align the emitted seam manifests with the configured OHIF datasource name.
- `METRICS_ENABLED=false` disables the metrics route and returns `404` from `/metrics`.

## Safety Boundary

No environment variable currently enables autonomous diagnosis, modality widening, or clinical-output mode changes. Scope and safety stay fixed in `src/domain/manifest.ts` until explicitly redesigned.