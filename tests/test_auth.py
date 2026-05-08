from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.dependencies.rate_limit import clear_rate_limits
from app.main import app

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
    # Aislamiento por test para evitar fugas de estado entre casos.
    clear_rate_limits()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function():
    clear_rate_limits()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


def test_register_and_login_success():
    app.dependency_overrides[get_db] = override_get_db

    register_payload = {
        "email": "jonathan@example.com",
        "password": "Jonathan1234",
    }

    with TestClient(app) as client:
        register_response = client.post("/auth/register", json=register_payload)
        login_response = client.post("/auth/login", json=register_payload)

    assert register_response.status_code == 201
    assert isinstance(register_response.json().get("access_token"), str)
    assert login_response.status_code == 200
    assert isinstance(login_response.json().get("access_token"), str)


def test_login_with_wrong_password_returns_401():
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        client.post(
            "/auth/register",
            json={"email": "jonathan@example.com", "password": "Jonathan1234"},
        )
        login_response = client.post(
            "/auth/login",
            json={"email": "jonathan@example.com", "password": "wrong-pass"},
        )

    assert login_response.status_code == 401


def test_login_rate_limited(monkeypatch):
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.dependencies.rate_limit.settings.RATE_LIMIT_LOGIN_REQUESTS", 2)

    with TestClient(app) as client:
        client.post(
            "/auth/register",
            json={"email": "jonathan@example.com", "password": "Jonathan1234"},
        )

        responses = [
            client.post(
                "/auth/login",
                json={"email": "jonathan@example.com", "password": "wrong-pass"},
            )
            for _ in range(3)
        ]

    assert responses[0].status_code == 401
    assert responses[1].status_code == 401
    assert responses[2].status_code == 429
    assert responses[2].json()["detail"] == "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos."
