import unittest

from fastapi.testclient import TestClient

from python_sidecar.app import create_app


class PythonSidecarAppTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(create_app())

    def test_health_and_ready_routes_report_scaffold_status(self) -> None:
        health_response = self.client.get("/healthz")
        ready_response = self.client.get("/readyz")

        self.assertEqual(health_response.status_code, 200)
        self.assertEqual(health_response.json()["status"], "ok")
        self.assertEqual(
            health_response.json()["service"]["name"],
            "mammography-python-sidecar",
        )

        self.assertEqual(ready_response.status_code, 200)
        self.assertEqual(ready_response.json()["status"], "ready")
        self.assertEqual(ready_response.json()["runtime"]["acceptingJobs"], False)
        self.assertEqual(ready_response.json()["runtime"]["mode"], "scaffold")

    def test_manifest_and_capabilities_expose_future_compute_boundary(self) -> None:
        manifest_response = self.client.get("/api/v1/manifest")
        capabilities_response = self.client.get("/api/v1/capabilities")

        self.assertEqual(manifest_response.status_code, 200)
        manifest = manifest_response.json()
        self.assertEqual(manifest["product"]["name"], "mammography-python-sidecar")
        self.assertEqual(manifest["scope"]["modality"], "FFDM")
        self.assertEqual(manifest["safety"]["outputMode"], "draft-only")
        self.assertEqual(manifest["runtime"]["framework"], "FastAPI")
        self.assertEqual(manifest["runtime"]["server"], "Uvicorn")

        self.assertEqual(capabilities_response.status_code, 200)
        capabilities = capabilities_response.json()
        self.assertEqual(capabilities["mode"], "scaffold")
        self.assertEqual(capabilities["implementedTasks"], [])
        self.assertEqual(
            capabilities["plannedTasks"],
            ["image-qc", "density-estimation", "draft-handoff"],
        )

    def test_openapi_document_is_available(self) -> None:
        response = self.client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        document = response.json()
        self.assertEqual(document["info"]["title"], "Mammography Python Sidecar API")
        self.assertIn("/api/v1/capabilities", document["paths"])


if __name__ == "__main__":
    unittest.main()