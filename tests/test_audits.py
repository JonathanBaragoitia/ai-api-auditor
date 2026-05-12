import json

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.database import Base, get_db
from app.dependencies.rate_limit import clear_rate_limits
from app.main import app
from app.models.audit import Audit
from app.schemas.audit import OpenAPIEndpointAnalysis
from app.services.ai_service import OllamaAnalysisError


SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def setup_function():
    clear_rate_limits()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function():
    clear_rate_limits()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


def get_auth_headers(client: TestClient, email: str = "test@example.com") -> dict:
    # Los endpoints de auditoría están protegidos con JWT;
    # este helper simplifica autenticación para los tests.
    register_payload = {
        "email": email,
        "password": "test1234",
    }
    register_response = client.post("/auth/register", json=register_payload)
    assert register_response.status_code == 201

    token = register_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def manual_audit_payload(name: str = "API de usuarios") -> dict:
    return {
        "name": name,
        "method": "GET",
        "path": "/users",
        "description": "Obtiene usuarios",
        "auth_required": True,
        "request_example": {"page": 1, "limit": 10},
        "response_example": {"users": []},
    }


def test_health_returns_ok():
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_manual_audit_success():
    app.dependency_overrides[get_db] = override_get_db

    payload = manual_audit_payload()

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/manual", json=payload, headers=headers)

    data = response.json()
    assert response.status_code == 201
    assert data["name"] == payload["name"]
    assert data["method"] == "GET"
    assert data["path"] == "/users"
    assert "score" in data
    assert data["status"] == "completed"


def test_manual_audit_returns_structured_issue():
    app.dependency_overrides[get_db] = override_get_db

    payload = manual_audit_payload()
    payload["auth_required"] = False

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/manual", json=payload, headers=headers)

    issue = response.json()["issues"][0]

    assert response.status_code == 201
    assert issue["title"] == "Falta autenticación"
    assert issue["severity"] == "high"
    assert issue["category"] == "security"
    assert "evidence" in issue
    assert "recommendation" in issue


def test_create_manual_audit_is_associated_to_authenticated_user():
    app.dependency_overrides[get_db] = override_get_db

    payload = manual_audit_payload()

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/manual", json=payload, headers=headers)

    db = TestingSessionLocal()
    try:
        audit = db.query(Audit).filter(Audit.id == response.json()["id"]).first()
    finally:
        db.close()

    assert response.status_code == 201
    assert audit is not None
    assert audit.user_id is not None


def test_audit_endpoints_require_token():
    app.dependency_overrides[get_db] = override_get_db

    payload = manual_audit_payload()

    with TestClient(app) as client:
        responses = [
            client.get("/audits/"),
            client.get("/audits/1"),
            client.get("/audits/history"),
            client.post("/audits/manual", json=payload),
            client.post("/audits/manual-ai", json=payload),
            client.post("/audits/openapi", json={"name": "Demo", "openapi_schema": {"paths": {}}}),
            client.post("/audits/ai-test"),
        ]

    assert all(response.status_code in {401, 403} for response in responses)


def test_get_audits_returns_list():
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "name": "API de pedidos",
        "method": "POST",
        "path": "/orders",
        "description": "Crea pedidos",
        "auth_required": False,
        "request_example": {"item": "book"},
        "response_example": {"id": 1},
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post("/audits/manual", json=payload, headers=headers)
        list_response = client.get("/audits/", headers=headers)

    assert create_response.status_code == 201
    assert list_response.status_code == 200
    assert isinstance(list_response.json(), list)
    assert len(list_response.json()) >= 1


def test_get_audits_returns_only_authenticated_user_audits():
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        first_headers = get_auth_headers(client, "first@example.com")
        second_headers = get_auth_headers(client, "second@example.com")

        first_response = client.post(
            "/audits/manual",
            json=manual_audit_payload("Auditoría primer usuario"),
            headers=first_headers,
        )
        second_response = client.post(
            "/audits/manual",
            json=manual_audit_payload("Auditoría segundo usuario"),
            headers=second_headers,
        )

        first_list_response = client.get("/audits/", headers=first_headers)
        second_list_response = client.get("/audits/", headers=second_headers)

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert [audit["name"] for audit in first_list_response.json()] == ["Auditoría primer usuario"]
    assert [audit["name"] for audit in second_list_response.json()] == ["Auditoría segundo usuario"]


def test_user_cannot_access_other_user_audit_detail():
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        owner_headers = get_auth_headers(client, "owner@example.com")
        other_headers = get_auth_headers(client, "other@example.com")

        create_response = client.post(
            "/audits/manual",
            json=manual_audit_payload("Auditoría privada"),
            headers=owner_headers,
        )
        owner_detail_response = client.get(f"/audits/{create_response.json()['id']}", headers=owner_headers)
        other_detail_response = client.get(f"/audits/{create_response.json()['id']}", headers=other_headers)

    assert create_response.status_code == 201
    assert owner_detail_response.status_code == 200
    assert other_detail_response.status_code == 404


def test_user_can_update_own_audit_notes_and_tags():
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post(
            "/audits/manual",
            json=manual_audit_payload("Auditoría con notas"),
            headers=headers,
        )
        update_response = client.patch(
            f"/audits/{create_response.json()['id']}/metadata",
            json={"notes": "Revisar antes de demo", "tags": ["Producción", "crítica", "producción"]},
            headers=headers,
        )
        detail_response = client.get(f"/audits/{create_response.json()['id']}", headers=headers)

    assert update_response.status_code == 200
    assert update_response.json()["notes"] == "Revisar antes de demo"
    assert update_response.json()["tags"] == ["producción", "crítica"]
    assert detail_response.json()["tags"] == ["producción", "crítica"]


def test_user_cannot_update_other_user_audit_metadata():
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        owner_headers = get_auth_headers(client, "metadata-owner@example.com")
        other_headers = get_auth_headers(client, "metadata-other@example.com")
        create_response = client.post(
            "/audits/manual",
            json=manual_audit_payload("Auditoría ajena"),
            headers=owner_headers,
        )
        update_response = client.patch(
            f"/audits/{create_response.json()['id']}/metadata",
            json={"notes": "No debería guardar", "tags": ["cliente"]},
            headers=other_headers,
        )

    assert update_response.status_code == 404


def test_audit_metadata_defaults_are_compatible_with_old_audits():
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post("/audits/manual", json=manual_audit_payload("Auditoría legacy"), headers=headers)

    data = create_response.json()
    assert data["notes"] is None
    assert data["tags"] == []


def test_openapi_audit_returns_total_endpoints(monkeypatch):
    def fake_analyze_openapi_schema(_openapi_schema, endpoints=None, audit_mode="enterprise"):
        return [
            OpenAPIEndpointAnalysis(
                method="GET",
                path="/users",
                summary="Lista usuarios",
                score=8.5,
                risk_level="low",
                issues=[],
                recommendations=["Mantener buenas prácticas"],
            )
        ]

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.routers.audits.analyze_openapi_schema", fake_analyze_openapi_schema)

    payload = {
        "name": "OpenAPI simple",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {
                "/users": {
                    "get": {
                        "summary": "List users",
                        "responses": {"200": {"description": "ok"}},
                    }
                }
            },
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    data = response.json()
    assert response.status_code == 200
    assert data["name"] == payload["name"]
    assert isinstance(data["id"], int)
    assert data["total_endpoints"] == 1
    assert isinstance(data["endpoints"], list)
    assert data["status"] == "completed"
    assert data["error_message"] is None
    assert data["audit_mode"] == "enterprise"


def test_openapi_audit_rate_limited(monkeypatch):
    def fake_analyze_openapi_schema(_openapi_schema, endpoints=None, audit_mode="enterprise"):
        return [
            OpenAPIEndpointAnalysis(
                method="GET",
                path="/users",
                summary="Lista usuarios",
                score=8.5,
                risk_level="low",
                issues=[],
                recommendations=["Mantener buenas prácticas"],
            )
        ]

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(settings, "RATE_LIMIT_AI_REQUESTS", 1)
    monkeypatch.setattr("app.routers.audits.analyze_openapi_schema", fake_analyze_openapi_schema)

    payload = {
        "name": "OpenAPI rate limit",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        first_response = client.post("/audits/openapi", json=payload, headers=headers)
        second_response = client.post("/audits/openapi", json=payload, headers=headers)

    assert first_response.status_code == 200
    assert second_response.status_code == 429
    assert second_response.json()["detail"] == "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos."


def test_openapi_audit_is_persisted_in_history(monkeypatch):
    def fake_analyze_openapi_schema(_openapi_schema, endpoints=None, audit_mode="enterprise"):
        return [
            OpenAPIEndpointAnalysis(
                method="GET",
                path="/users",
                summary="Lista usuarios",
                score=8.5,
                risk_level="low",
                issues=["missing pagination"],
                recommendations=["add pagination"],
            )
        ]

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.routers.audits.analyze_openapi_schema", fake_analyze_openapi_schema)

    payload = {
        "name": "OpenAPI persistida",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post("/audits/openapi", json=payload, headers=headers)
        list_response = client.get("/audits/", headers=headers)
        detail_response = client.get(f"/audits/{create_response.json()['id']}", headers=headers)

    history_item = list_response.json()[0]
    detail = detail_response.json()

    assert create_response.status_code == 200
    assert list_response.status_code == 200
    assert history_item["total_endpoints"] == 1
    assert isinstance(history_item["endpoints"], list)
    assert history_item["status"] == "completed"
    assert history_item["audit_mode"] == "enterprise"
    assert detail["name"] == payload["name"]
    assert detail["audit_mode"] == "enterprise"
    assert detail["endpoints"][0]["path"] == "/users"


def test_openapi_audit_global_risk_uses_worst_endpoint_and_aggregates_findings(monkeypatch):
    def fake_analyze_openapi_schema(_openapi_schema, endpoints=None, audit_mode="enterprise"):
        return [
            OpenAPIEndpointAnalysis(
                method="GET",
                path="/users",
                summary="Lista usuarios",
                score=9.0,
                risk_level="low",
                issues=[],
                recommendations=["Mantener paginación documentada."],
            ),
            OpenAPIEndpointAnalysis(
                method="POST",
                path="/payments",
                summary="Crea pagos",
                score=6.0,
                risk_level="crítico",
                issues=["Falta autenticación explícita en pagos."],
                recommendations=["Añadir security scheme a /payments."],
            ),
        ]

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.routers.audits.analyze_openapi_schema", fake_analyze_openapi_schema)

    payload = {
        "name": "OpenAPI con riesgos mixtos",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {
                "/users": {"get": {"responses": {"200": {"description": "ok"}}}},
                "/payments": {"post": {"responses": {"201": {"description": "created"}}}},
            },
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post("/audits/openapi", json=payload, headers=headers)
        list_response = client.get("/audits/", headers=headers)
        detail_response = client.get(f"/audits/{create_response.json()['id']}", headers=headers)

    created = create_response.json()
    history_item = list_response.json()[0]
    detail = detail_response.json()

    assert create_response.status_code == 200
    assert created["global_risk_level"] == "critical"
    assert created["issues"][0]["title"] == "Falta autenticación explícita en pagos."
    assert created["issues"][0]["occurrences"] == 1
    assert created["issues"][0]["affected_endpoints"] == [
        {"method": "POST", "path": "/payments", "risk_level": "critical"}
    ]
    assert [recommendation["recommendation"] for recommendation in created["recommendations"]] == [
        "Mantener paginación documentada.",
        "Añadir esquema de seguridad a /payments.",
    ]
    assert history_item["risk_level"] == "critical"
    assert history_item["issues"] == created["issues"]
    assert detail["global_risk_level"] == "critical"
    assert detail["recommendations"] == created["recommendations"]


def test_openapi_legacy_audit_derives_global_findings_from_endpoints(monkeypatch):
    def fake_analyze_openapi_schema(_openapi_schema, endpoints=None, audit_mode="enterprise"):
        return [
            OpenAPIEndpointAnalysis(
                method="GET",
                path="/orders",
                summary="Lista pedidos",
                score=7.0,
                risk_level="medium",
                issues=["Falta paginación en listado de pedidos."],
                recommendations=["Añadir parámetros page y limit."],
            )
        ]

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.routers.audits.analyze_openapi_schema", fake_analyze_openapi_schema)

    payload = {
        "name": "OpenAPI legacy",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/orders": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post("/audits/openapi", json=payload, headers=headers)
        audit_id = create_response.json()["id"]

        db = TestingSessionLocal()
        try:
            audit = db.query(Audit).filter(Audit.id == audit_id).first()
            audit.issues = json.dumps([])
            audit.recommendations = json.dumps([])
            db.commit()
        finally:
            db.close()

        list_response = client.get("/audits/", headers=headers)
        detail_response = client.get(f"/audits/{audit_id}", headers=headers)

    assert create_response.status_code == 200
    assert list_response.json()[0]["issues"][0]["title"] == "Falta paginación en listado de pedidos."
    assert list_response.json()[0]["issues"][0]["affected_endpoints"] == [
        {"method": "GET", "path": "/orders", "risk_level": "medium"}
    ]
    assert list_response.json()[0]["recommendations"][0]["recommendation"] == "Añadir parámetros page y limit."
    assert detail_response.json()["issues"][0]["title"] == "Falta paginación en listado de pedidos."
    assert detail_response.json()["recommendations"][0]["recommendation"] == "Añadir parámetros page y limit."


def test_openapi_audit_deduplicates_similar_findings_and_keeps_unique_ones(monkeypatch):
    def fake_analyze_openapi_schema(_openapi_schema, endpoints=None, audit_mode="enterprise"):
        return [
            OpenAPIEndpointAnalysis(
                method="GET",
                path="/users",
                summary="Lista usuarios",
                score=5.0,
                risk_level="high",
                issues=[
                    {
                        "title": "Falta autenticación",
                        "severity": "high",
                        "category": "security",
                        "evidence": "GET /users no declara autenticación.",
                        "recommendation": "Añadir autenticación JWT.",
                    }
                ],
                recommendations=["Añadir autenticación JWT."],
            ),
            OpenAPIEndpointAnalysis(
                method="GET",
                path="/orders",
                summary="Lista pedidos",
                score=5.5,
                risk_level="high",
                issues=[
                    {
                        "title": "Autenticación faltante",
                        "severity": "high",
                        "category": "security",
                        "evidence": "GET /orders no declara security.",
                        "recommendation": "Añadir autenticación JWT.",
                    },
                    {
                        "title": "Falta paginación",
                        "severity": "medium",
                        "category": "performance",
                        "evidence": "GET /orders lista recursos sin page ni limit.",
                        "recommendation": "Añadir paginación con page y limit.",
                    },
                ],
                recommendations=["Añadir autenticación JWT.", "Añadir paginación con page y limit."],
            ),
        ]

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.routers.audits.analyze_openapi_schema", fake_analyze_openapi_schema)

    payload = {
        "name": "OpenAPI deduplicada",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {
                "/users": {"get": {"responses": {"200": {"description": "ok"}}}},
                "/orders": {"get": {"responses": {"200": {"description": "ok"}}}},
            },
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    issues = response.json()["issues"]
    recommendations = response.json()["recommendations"]

    assert response.status_code == 200
    assert len(issues) == 2
    assert issues[0]["title"] == "Falta autenticación"
    assert issues[0]["occurrences"] == 2
    assert issues[0]["affected_endpoints"] == [
        {"method": "GET", "path": "/users", "risk_level": "high"},
        {"method": "GET", "path": "/orders", "risk_level": "high"},
    ]
    assert issues[1]["title"] == "Falta paginación"
    assert [recommendation["recommendation"] for recommendation in recommendations] == [
        "Añadir autenticación JWT.",
        "Añadir paginación con page y limit.",
    ]
    assert recommendations[0]["occurrences"] == 2


def test_openapi_audit_failed_status_is_stored_in_history():
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "name": "OpenAPI fallida",
        "openapi_schema": {"openapi": "3.0.0", "info": {"title": "Demo", "version": "1.0.0"}},
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post("/audits/openapi", json=payload, headers=headers)
        list_response = client.get("/audits/", headers=headers)

    failed_audit = list_response.json()[0]

    assert create_response.status_code == 400
    assert create_response.json()["detail"]["error"]["code"] == "OPENAPI_INVALID"
    assert create_response.json()["detail"]["error"]["status"] == "failed"
    assert failed_audit["name"] == payload["name"]
    assert failed_audit["status"] == "failed"
    assert "paths" in failed_audit["error_message"]


def test_openapi_audit_rejects_schema_without_paths():
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "name": "OpenAPI sin paths",
        "openapi_schema": {"openapi": "3.0.0", "info": {"title": "Demo", "version": "1.0.0"}},
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "OPENAPI_INVALID"
    assert "paths" in response.json()["detail"]["error"]["message"]


def test_openapi_audit_rejects_empty_paths():
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "name": "OpenAPI vacío",
        "openapi_schema": {"openapi": "3.0.0", "info": {"title": "Demo", "version": "1.0.0"}, "paths": {}},
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    assert response.status_code == 400
    assert "al menos un endpoint válido" in response.json()["detail"]["error"]["message"]


def test_openapi_audit_rejects_too_large_schema(monkeypatch):
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(settings, "MAX_OPENAPI_SIZE_CHARS", 120)

    payload = {
        "name": "OpenAPI grande",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo", "version": "1.0.0", "description": "x" * 200},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    assert response.status_code == 413
    assert "tamaño máximo" in response.json()["detail"]["error"]["message"]


def test_openapi_audit_rejects_too_many_endpoints(monkeypatch):
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(settings, "MAX_OPENAPI_ENDPOINTS", 1)

    payload = {
        "name": "OpenAPI demasiados endpoints",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo", "version": "1.0.0"},
            "paths": {
                "/users": {"get": {"responses": {"200": {"description": "ok"}}}},
                "/orders": {"get": {"responses": {"200": {"description": "ok"}}}},
            },
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    assert response.status_code == 400
    assert "número máximo de endpoints" in response.json()["detail"]["error"]["message"]


def test_openapi_audit_stores_failed_status_when_ai_fails(monkeypatch):
    def fake_analyze_with_ollama(_prompt):
        raise OllamaAnalysisError("No se pudo conectar con Ollama: connection refused")

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.services.openapi_service.analyze_with_ollama", fake_analyze_with_ollama)

    payload = {
        "name": "OpenAPI con Ollama caído",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post("/audits/openapi", json=payload, headers=headers)
        list_response = client.get("/audits/", headers=headers)

    error = create_response.json()["detail"]["error"]
    failed_audit = list_response.json()[0]

    assert create_response.status_code == 502
    assert error["code"] == "AI_ANALYSIS_FAILED"
    assert error["status"] == "failed"
    assert "Ollama" in error["message"]
    assert failed_audit["status"] == "failed"
    assert failed_audit["error_message"] == error["message"]


def test_openapi_audit_uses_safe_fallback_when_ai_response_is_invalid(monkeypatch):
    def fake_analyze_with_ollama(_prompt):
        return {
            "score": "not-a-number",
            "risk_level": None,
            "issues": "invalid-json-from-ai",
            "recommendations": None,
        }

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.services.openapi_service.analyze_with_ollama", fake_analyze_with_ollama)

    payload = {
        "name": "OpenAPI con IA inválida",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    data = response.json()

    assert response.status_code == 200
    assert data["total_endpoints"] == 1
    assert data["endpoints"][0]["score"] == 5.0
    assert data["endpoints"][0]["risk_level"] == "medium"
    assert data["endpoints"][0]["issues"][0]["title"] == "invalid-json-from-ai"
    assert data["endpoints"][0]["issues"][0]["severity"] == "medium"


def test_openapi_audit_accepts_structured_ai_issues(monkeypatch):
    def fake_analyze_with_ollama(_prompt):
        return {
            "score": 4,
            "risk_level": "high",
            "issues": [
                {
                    "title": "Falta autenticación",
                    "severity": "critical",
                    "category": "security",
                    "evidence": "GET /users no declara security scheme.",
                    "recommendation": "Añadir autenticación JWT u OAuth2.",
                    "fix_suggestion": {
                        "title": "Declarar esquema JWT",
                        "explanation": "Añade un securityScheme Bearer y referencia el esquema en la operación.",
                        "openapi_example": "components:\n  securitySchemes:\n    bearerAuth:\n      type: http",
                        "error_response_example": '{"detail":"Token inválido"}',
                        "priority": "alta",
                    },
                }
                ],
            "recommendations": ["Añadir controles de acceso."],
            "summary": "Endpoint con exposición sensible.",
            "technical_observation": "El contrato requiere controles explícitos.",
            "security_observation": "Existe riesgo de acceso no autorizado.",
            "maintainability_observation": "Documentar el esquema de seguridad mejora la mantenibilidad.",
        }

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.services.openapi_service.analyze_with_ollama", fake_analyze_with_ollama)

    payload = {
        "name": "OpenAPI con issue estructurado",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    issue = response.json()["endpoints"][0]["issues"][0]

    assert response.status_code == 200
    assert issue["title"] == "Falta autenticación"
    assert issue["severity"] == "critical"
    assert issue["category"] == "security"
    assert issue["recommendation"] == "Añadir autenticación JWT u OAuth2."
    assert issue["fix_suggestion"]["title"] == "Declarar esquema JWT"
    assert issue["fix_suggestion"]["priority"] == "alta"


def test_openapi_audit_adds_textual_fix_suggestion_when_missing(monkeypatch):
    def fake_analyze_with_ollama(_prompt):
        return {
            "score": 5,
            "risk_level": "medium",
            "issues": ["Falta paginación en endpoint de listado"],
            "recommendations": ["Añadir parámetros page y limit."],
        }

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.services.openapi_service.analyze_with_ollama", fake_analyze_with_ollama)

    payload = {
        "name": "OpenAPI con sugerencia fallback",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    issue = response.json()["endpoints"][0]["issues"][0]

    assert response.status_code == 200
    assert issue["fix_suggestion"]["title"].startswith("Corregir:")
    assert issue["fix_suggestion"]["explanation"] == "Añadir parámetros page y limit."
    assert issue["fix_suggestion"]["priority"] == "media"


def test_openapi_audit_accepts_and_persists_audit_mode(monkeypatch):
    captured = {}

    def fake_analyze_openapi_schema(_openapi_schema, endpoints=None, audit_mode="enterprise"):
        captured["audit_mode"] = audit_mode
        return [
            OpenAPIEndpointAnalysis(
                method="GET",
                path="/users",
                summary="Lista usuarios",
                score=7.0,
                risk_level="medium",
                issues=[],
                recommendations=[],
            )
        ]

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.routers.audits.analyze_openapi_schema", fake_analyze_openapi_schema)

    payload = {
        "name": "OpenAPI modo seguridad",
        "audit_mode": "security",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        create_response = client.post("/audits/openapi", json=payload, headers=headers)
        list_response = client.get("/audits/", headers=headers)

    assert create_response.status_code == 200
    assert captured["audit_mode"] == "security"
    assert create_response.json()["audit_mode"] == "security"
    assert list_response.json()[0]["audit_mode"] == "security"


def test_openapi_audit_prompt_changes_by_audit_mode(monkeypatch):
    prompts = []

    def fake_analyze_with_ollama(prompt):
        prompts.append(prompt)
        return {
            "score": 8,
            "risk_level": "low",
            "issues": [],
            "recommendations": [],
            "summary": "Documentación revisada.",
        }

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.services.openapi_service.analyze_with_ollama", fake_analyze_with_ollama)

    payload = {
        "name": "OpenAPI modo documentación",
        "audit_mode": "documentation",
        "openapi_schema": {
            "openapi": "3.0.0",
            "info": {"title": "Demo API", "version": "1.0.0"},
            "paths": {"/users": {"get": {"responses": {"200": {"description": "ok"}}}}},
        },
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/openapi", json=payload, headers=headers)

    assert response.status_code == 200
    assert "Modo de auditoría seleccionado: documentation" in prompts[0]
    assert "summaries, descriptions, schemas, examples" in prompts[0]
