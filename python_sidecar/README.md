# Python Sidecar

This directory contains the minimal Python imaging sidecar scaffold for the FFDM mammography standalone.

## Current Scope

- FastAPI application scaffold
- Uvicorn-compatible ASGI entrypoint
- health, readiness, manifest, and capability routes
- no live imaging inference yet

## Install

```bash
python -m pip install -r python_sidecar/requirements.txt
```

## Run

```bash
uvicorn python_sidecar.app:create_app --factory --host 0.0.0.0 --port 8040
```

## Test

```bash
python -m unittest python_sidecar.tests.test_app
```