from fastapi import FastAPI


SERVICE = {
  "name": "mammography-python-sidecar",
  "version": "0.1.0",
  "role": "imaging-sidecar",
}

MANIFEST = {
  "product": {
    **SERVICE,
    "mode": "clinician-in-the-loop",
  },
  "scope": {
    "modality": "FFDM",
    "inputShape": "dicom-manifest",
    "outputShape": "draft-only-imaging-signals",
  },
  "safety": {
    "reviewRequired": True,
    "outputMode": "draft-only",
    "autonomousDiagnosis": False,
  },
  "runtime": {
    "framework": "FastAPI",
    "server": "Uvicorn",
    "mode": "scaffold",
  },
}

CAPABILITIES = {
  "mode": "scaffold",
  "implementedTasks": [],
  "plannedTasks": [
    "image-qc",
    "density-estimation",
    "draft-handoff",
  ],
  "transport": "http-json",
  "docs": ["/openapi.json", "/docs", "/redoc"],
}


def create_app() -> FastAPI:
  app = FastAPI(
    title="Mammography Python Sidecar API",
    version="0.1.0",
    summary="Minimal FFDM imaging sidecar scaffold.",
    description=(
      "A FastAPI and Uvicorn-based scaffold for future FFDM imaging compute. "
      "This sidecar exposes only health, readiness, manifest, and capability "
      "surfaces today; it does not yet execute production imaging inference."
    ),
  )

  @app.get("/healthz")
  def healthz() -> dict[str, object]:
    return {
      "status": "ok",
      "service": SERVICE,
      "runtime": {
        "mode": "scaffold",
      },
    }

  @app.get("/readyz")
  def readyz() -> dict[str, object]:
    return {
      "status": "ready",
      "service": SERVICE,
      "runtime": {
        "mode": "scaffold",
        "acceptingJobs": False,
      },
    }

  @app.get("/api/v1/manifest")
  def manifest() -> dict[str, object]:
    return MANIFEST

  @app.get("/api/v1/capabilities")
  def capabilities() -> dict[str, object]:
    return CAPABILITIES

  return app


app = create_app()