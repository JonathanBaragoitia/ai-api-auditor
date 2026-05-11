import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.rate_limit import rate_limit_ai_audit
from app.db.database import get_db
from app.models.audit import Audit
from app.models.user import User
from app.services.audit_service import analyze_manual_audit
from app.services.ai_service import OllamaAnalysisError, SPANISH_OUTPUT_INSTRUCTIONS, analyze_with_ollama
from app.schemas.audit import (
    AuditResponse,
    ManualAuditRequest,
    OpenAPIAuditRequest,
    OpenAPIAuditResponse,
)
from app.services.openapi_service import (
    OpenAPIValidationError,
    analyze_openapi_schema,
    build_global_observations,
    calculate_global_audit_result,
    validate_openapi_schema,
)


router = APIRouter(prefix="/audits", tags=["Audits"])
logger = logging.getLogger(__name__)


def normalize_audit_status(status: str | None) -> str:
    if status == "running":
        return "processing"

    if status in {"pending", "processing", "completed", "failed"}:
        return status

    return "completed"


def error_detail(code: str, message: str, audit: Audit | None = None) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "audit_id": audit.id if audit else None,
            "status": normalize_audit_status(audit.status) if audit else "failed",
        }
    }


def parse_audit(audit: Audit) -> AuditResponse:
    # Persistimos estructuras complejas como JSON en texto;
    # aquí se reconstruyen para responder con contrato tipado.
    return AuditResponse(
        id=audit.id,
        name=audit.name,
        method=audit.method,
        path=audit.path,
        description=audit.description,
        auth_required=audit.auth_required == "true",
        request_example=json.loads(audit.request_example) if audit.request_example else None,
        response_example=json.loads(audit.response_example) if audit.response_example else None,
        score=audit.score,
        risk_level=audit.risk_level,
        issues=json.loads(audit.issues),
        recommendations=json.loads(audit.recommendations),
        summary=audit.summary,
        technical_observation=audit.technical_observation,
        security_observation=audit.security_observation,
        maintainability_observation=audit.maintainability_observation,
        created_at=audit.created_at,
        total_endpoints=audit.total_endpoints,
        average_score=audit.average_score,
        global_risk_level=audit.global_risk_level,
        endpoints=json.loads(audit.openapi_endpoints) if audit.openapi_endpoints else None,
        status=normalize_audit_status(audit.status),
        error_message=audit.error_message,
    )


@router.get("/", response_model=list[AuditResponse])
def get_audits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audits = (
        db.query(Audit)
        .filter(Audit.user_id == current_user.id)
        .order_by(Audit.created_at.desc())
        .all()
    )
    return [parse_audit(audit) for audit in audits]


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audits = (
        db.query(Audit)
        .filter(Audit.user_id == current_user.id)
        .order_by(Audit.created_at.desc())
        .all()
    )
    return [parse_audit(audit) for audit in audits]


@router.get("/{audit_id}", response_model=AuditResponse)
def get_audit(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audit = (
        db.query(Audit)
        .filter(Audit.id == audit_id, Audit.user_id == current_user.id)
        .first()
    )

    if not audit:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada.")

    return parse_audit(audit)


@router.post("/manual", response_model=AuditResponse, status_code=201)
def create_manual_audit(
    data: ManualAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # El usuario autenticado se inyecta para forzar control de acceso,
    # aunque no se use explícitamente en la lógica de scoring.
    logger.info("audit started: type=manual name=%s user_id=%s", data.name, current_user.id)
    analysis = analyze_manual_audit(data)

    audit = Audit(
        user_id=current_user.id,
        name=data.name,
        method=data.method.upper(),
        path=data.path,
        description=data.description,
        auth_required=str(data.auth_required).lower(),
        request_example=json.dumps(data.request_example) if data.request_example else None,
        response_example=json.dumps(data.response_example) if data.response_example else None,
        score=analysis.score,
        risk_level=analysis.risk_level,
        issues=json.dumps(jsonable_encoder(analysis.issues)),
        recommendations=json.dumps(jsonable_encoder(analysis.recommendations)),
        summary=analysis.summary,
        technical_observation=analysis.technical_observation,
        security_observation=analysis.security_observation,
        maintainability_observation=analysis.maintainability_observation,
        status="completed",
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)
    logger.info("audit completed: id=%s type=manual", audit.id)

    return parse_audit(audit)


@router.post("/ai-test")
def ai_test(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    rate_limit_ai_audit(request, current_user)

    prompt = """
    Endpoint:
    GET /users

    No tiene autenticación.
    Devuelve lista de usuarios.

    Responde siempre en español profesional.
    """

    result = analyze_with_ollama(prompt)

    return result


@router.post("/manual-ai", response_model=AuditResponse, status_code=201)
def create_manual_ai_audit(
    request: Request,
    data: ManualAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rate_limit_ai_audit(request, current_user)
    logger.info("audit started: type=manual-ai name=%s user_id=%s", data.name, current_user.id)

    audit = Audit(
        user_id=current_user.id,
        name=data.name,
        method=data.method.upper(),
        path=data.path,
        description=data.description,
        auth_required=str(data.auth_required).lower(),
        request_example=json.dumps(data.request_example) if data.request_example is not None else None,
        response_example=json.dumps(data.response_example) if data.response_example is not None else None,
        score=0.0,
        risk_level="high",
        issues=json.dumps([]),
        recommendations=json.dumps([]),
        status="processing",
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    prompt = f"""
    Endpoint:
    {data.method} {data.path}

    {SPANISH_OUTPUT_INSTRUCTIONS}

    Descripción:
    {data.description}

    Autenticación requerida:
    {data.auth_required}

    Ejemplo de request:
    {data.request_example}

    Ejemplo de response:
    {data.response_example}

    Analiza este endpoint y devuelve una auditoría técnica.
    Devuelve summary, issues, recommendations y observaciones narrativas siempre en español.
    """

    try:
        analysis = analyze_with_ollama(prompt)
    except OllamaAnalysisError as exc:
        audit.status = "failed"
        audit.error_message = str(exc)
        db.commit()
        logger.info("audit failed: id=%s reason=%s", audit.id, audit.error_message)
        raise HTTPException(
            status_code=502,
            detail=error_detail("AI_ANALYSIS_FAILED", audit.error_message, audit),
        ) from exc

    audit.score = analysis["score"]
    audit.risk_level = analysis["risk_level"]
    audit.issues = json.dumps(analysis["issues"])
    audit.recommendations = json.dumps(analysis["recommendations"])
    audit.summary = analysis.get("summary")
    audit.technical_observation = analysis.get("technical_observation")
    audit.security_observation = analysis.get("security_observation")
    audit.maintainability_observation = analysis.get("maintainability_observation")
    audit.status = "completed"
    audit.error_message = None

    db.commit()
    db.refresh(audit)
    logger.info("audit completed: id=%s type=manual-ai", audit.id)

    return parse_audit(audit)


@router.post("/openapi", response_model=OpenAPIAuditResponse)
def create_openapi_audit(
    request: Request,
    data: OpenAPIAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rate_limit_ai_audit(request, current_user)

    logger.info("audit started: type=openapi name=%s user_id=%s", data.name, current_user.id)
    audit = Audit(
        user_id=current_user.id,
        name=data.name,
        method="OPENAPI",
        path="OpenAPI",
        description="Auditoría OpenAPI completa",
        auth_required="true",
        request_example=None,
        response_example=None,
        score=0.0,
        risk_level="high",
        issues=json.dumps([]),
        recommendations=json.dumps([]),
        total_endpoints=0,
        average_score=0.0,
        global_risk_level="high",
        openapi_endpoints=json.dumps([]),
        status="processing",
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    try:
        endpoints = validate_openapi_schema(data.openapi_schema)
    except OpenAPIValidationError as exc:
        audit.status = "failed"
        audit.error_message = str(exc)
        db.commit()
        logger.info("audit failed: id=%s reason=%s", audit.id, audit.error_message)
        raise HTTPException(
            status_code=exc.status_code,
            detail=error_detail("OPENAPI_INVALID", audit.error_message, audit),
        ) from exc

    try:
        endpoint_results = analyze_openapi_schema(data.openapi_schema, endpoints=endpoints)
    except OllamaAnalysisError as exc:
        audit.status = "failed"
        audit.error_message = str(exc)
        db.commit()
        logger.info("audit failed: id=%s reason=%s", audit.id, audit.error_message)
        raise HTTPException(
            status_code=502,
            detail=error_detail("AI_ANALYSIS_FAILED", audit.error_message, audit),
        ) from exc
    except Exception as exc:
        audit.status = "failed"
        audit.error_message = str(exc) or "No se pudo completar la auditoría OpenAPI."
        db.commit()
        logger.exception("audit failed: id=%s", audit.id)
        raise HTTPException(
            status_code=502,
            detail=error_detail("AUDIT_ANALYSIS_FAILED", audit.error_message, audit),
        ) from exc

    average_score, global_risk_level = calculate_global_audit_result(endpoint_results)
    observations = build_global_observations(endpoint_results)

    endpoints_data = [endpoint.model_dump() for endpoint in endpoint_results]
    audit.score = average_score
    audit.risk_level = global_risk_level
    audit.summary = observations["summary"]
    audit.technical_observation = observations["technical_observation"]
    audit.security_observation = observations["security_observation"]
    audit.maintainability_observation = observations["maintainability_observation"]
    audit.total_endpoints = len(endpoint_results)
    audit.average_score = average_score
    audit.global_risk_level = global_risk_level
    audit.openapi_endpoints = json.dumps(endpoints_data)
    audit.status = "completed"
    audit.error_message = None

    try:
        db.commit()
        db.refresh(audit)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to store OpenAPI audit. Check Alembic migrations and database schema.")
        message = (
            "No se pudo guardar la auditoría OpenAPI. "
            "Revisa que la base de datos tenga las migraciones aplicadas con: "
            "python -m alembic upgrade head"
        )
        raise HTTPException(
            status_code=500,
            detail=error_detail("AUDIT_STORAGE_FAILED", message, audit),
        ) from exc

    logger.info("audit completed: id=%s endpoints=%s", audit.id, len(endpoint_results))

    return OpenAPIAuditResponse(
        id=audit.id,
        name=data.name,
        total_endpoints=len(endpoint_results),
        average_score=average_score,
        global_risk_level=global_risk_level,
        summary=observations["summary"],
        technical_observation=observations["technical_observation"],
        security_observation=observations["security_observation"],
        maintainability_observation=observations["maintainability_observation"],
        endpoints=endpoint_results,
        status=audit.status,
        error_message=audit.error_message,
    )
