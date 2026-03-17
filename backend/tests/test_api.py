"""Tests for the FastAPI endpoints."""

from unittest.mock import patch

import pytest
from app.main import app
from fastapi.testclient import TestClient

PENICILLIN_G = "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O"
AMOXICILLIN = "CC1(C)SC2C(NC(=O)C(N)c3ccc(O)cc3)C(=O)N2C1C(=O)O"


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthEndpoint:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestAlignEndpoint:
    def test_align_success(self, client):
        resp = client.post("/align", json={
            "reference_smiles": PENICILLIN_G,
            "probe_smiles": AMOXICILLIN,
            "num_conformers": 5,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) > 0
        assert data["mcs_smarts"] != ""
        assert data["num_mcs_atoms"] > 0

    def test_align_invalid_smiles(self, client):
        resp = client.post("/align", json={
            "reference_smiles": "invalid!!!",
            "probe_smiles": AMOXICILLIN,
        })
        assert resp.status_code == 422

    def test_align_empty_smiles(self, client):
        resp = client.post("/align", json={
            "reference_smiles": "",
            "probe_smiles": AMOXICILLIN,
        })
        assert resp.status_code == 422

    def test_align_result_structure(self, client):
        resp = client.post("/align", json={
            "reference_smiles": PENICILLIN_G,
            "probe_smiles": AMOXICILLIN,
            "num_conformers": 5,
        })
        data = resp.json()
        result = data["results"][0]
        assert "rank" in result
        assert "reference_molblock" in result
        assert "probe_molblock" in result
        assert "alignment_score" in result
        assert "shape_tanimoto" in result
        assert "rmsd" in result
        assert "conformer_energy" in result


class TestFingerprintEndpoint:
    def test_fingerprint_success(self, client):
        resp = client.post("/fingerprint", json={"smiles": PENICILLIN_G})
        assert resp.status_code == 200
        data = resp.json()
        assert data["smiles"] == PENICILLIN_G
        assert len(data["bits_on"]) > 0
        assert data["n_bits"] == 2048
        assert 0 < data["density"] < 1.0

    def test_fingerprint_invalid_smiles(self, client):
        resp = client.post("/fingerprint", json={"smiles": "not_valid"})
        assert resp.status_code == 422


class TestPropertiesEndpoint:
    def test_properties_invalid_smiles(self, client):
        resp = client.post("/properties", json={"smiles_list": ["not_a_smiles"]})
        assert resp.status_code == 422

    def test_properties_mixed_invalid_smiles(self, client):
        resp = client.post(
            "/properties",
            json={"smiles_list": [PENICILLIN_G, "bad!!!"]},
        )
        assert resp.status_code == 422

    def test_properties_empty_list(self, client):
        resp = client.post("/properties", json={"smiles_list": []})
        assert resp.status_code == 422

    def test_properties_both_models_fail_returns_503(self, client):
        with patch(
            "app.properties.predict_solubility",
            side_effect=RuntimeError("model unavailable"),
        ), patch(
            "app.properties.predict_toxicity",
            side_effect=RuntimeError("model unavailable"),
        ):
            resp = client.post(
                "/properties",
                json={"smiles_list": [PENICILLIN_G]},
            )
            assert resp.status_code == 503
            assert "unavailable" in resp.json()["detail"]

    def test_properties_partial_failure_returns_200(self, client):
        """If only one model fails, the endpoint should still return 200."""
        with patch(
            "app.properties.predict_solubility",
            return_value=[1.23],
        ), patch(
            "app.properties.predict_toxicity",
            side_effect=RuntimeError("model unavailable"),
        ):
            resp = client.post(
                "/properties",
                json={"smiles_list": [PENICILLIN_G]},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["predictions"][0]["esol_log_solubility"] == 1.23
            assert data["predictions"][0]["tox21_predictions"] is None

    def test_properties_success_structure(self, client):
        """Verify response structure with mocked models."""
        with patch(
            "app.properties.predict_solubility",
            return_value=[-2.5],
        ), patch(
            "app.properties.predict_toxicity",
            return_value=[{"NR-AR": 0.1}],
        ):
            resp = client.post(
                "/properties",
                json={"smiles_list": [PENICILLIN_G]},
            )
            assert resp.status_code == 200
            pred = resp.json()["predictions"][0]
            assert pred["smiles"] == PENICILLIN_G
            assert pred["esol_log_solubility"] == -2.5
            assert pred["tox21_predictions"] == {"NR-AR": 0.1}
