from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
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


def get_auth_headers(client: TestClient) -> dict:
    # Los endpoints de auditoría están protegidos con JWT;
    # este helper simplifica autenticación para los tests.
    register_payload = {
        "email": "test@example.com",
        "password": "test1234",
    }
    register_response = client.post("/auth/register", json=register_payload)
    assert register_response.status_code == 201

    token = register_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_returns_ok():
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_manual_audit_success():
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "name": "API de usuarios",
        "method": "GET",
        "path": "/users",
        "description": "Obtiene usuarios",
        "auth_required": True,
        "request_example": {"page": 1, "limit": 10},
        "response_example": {"users": []},
    }

    with TestClient(app) as client:
        headers = get_auth_headers(client)
        response = client.post("/audits/manual", json=payload, headers=headers)

    data = response.json()
    assert response.status_code == 201
    assert data["name"] == payload["name"]
    assert data["method"] == "GET"
    assert data["path"] == "/users"
    assert "score" in data


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
        detail_response = client.get(f"/audits/{create_response.json()['id']}")

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
