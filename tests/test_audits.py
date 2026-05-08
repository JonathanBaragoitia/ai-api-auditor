from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
from app.models.audit import Audit
from app.schemas.audit import OpenAPIEndpointAnalysis


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
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function():
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


def test_openapi_audit_returns_total_endpoints(monkeypatch):
    def fake_analyze_openapi_schema(_openapi_schema):
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


def test_openapi_audit_is_persisted_in_history(monkeypatch):
    def fake_analyze_openapi_schema(_openapi_schema):
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
    assert detail["name"] == payload["name"]
    assert detail["endpoints"][0]["path"] == "/users"


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
