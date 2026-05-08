import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.db.database import get_db
from app.models.audit import Audit
from app.models.user import User
from app.services.audit_service import analyze_manual_audit
from app.services.ai_service import SPANISH_OUTPUT_INSTRUCTIONS, analyze_with_ollama
from app.schemas.audit import (
    AuditResponse,
    ManualAuditRequest,
    OpenAPIAuditRequest,
    OpenAPIAuditResponse,
)
from app.services.openapi_service import (
    analyze_openapi_schema,
    build_global_observations,
    calculate_global_audit_result,
)


router = APIRouter(prefix="/audits", tags=["Audits"])
logger = logging.getLogger(__name__)


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
        issues=json.dumps(analysis.issues),
        recommendations=json.dumps(analysis.recommendations),
        summary=analysis.summary,
        technical_observation=analysis.technical_observation,
        security_observation=analysis.security_observation,
        maintainability_observation=analysis.maintainability_observation,
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return parse_audit(audit)


@router.post("/ai-test")
def ai_test(_current_user: User = Depends(get_current_user)):
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
    data: ManualAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    analysis = analyze_with_ollama(prompt)

    if "error" in analysis:
        raise HTTPException(status_code=500, detail="Error en el análisis con IA.")

    audit = Audit(
        user_id=current_user.id,
        name=data.name,
        method=data.method.upper(),
        path=data.path,
        description=data.description,
        auth_required=str(data.auth_required).lower(),
        request_example=json.dumps(data.request_example) if data.request_example is not None else None,
        response_example=json.dumps(data.response_example) if data.response_example is not None else None,
        score=analysis["score"],
        risk_level=analysis["risk_level"],
        issues=json.dumps(analysis["issues"]),
        recommendations=json.dumps(analysis["recommendations"]),
        summary=analysis.get("summary"),
        technical_observation=analysis.get("technical_observation"),
        security_observation=analysis.get("security_observation"),
        maintainability_observation=analysis.get("maintainability_observation"),
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return parse_audit(audit)


@router.post("/openapi", response_model=OpenAPIAuditResponse)
def create_openapi_audit(
    data: OpenAPIAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("Starting OpenAPI audit: name=%s", data.name)
    endpoint_results = analyze_openapi_schema(data.openapi_schema)

    average_score, global_risk_level = calculate_global_audit_result(endpoint_results)
    observations = build_global_observations(endpoint_results)

    endpoints_data = [endpoint.model_dump() for endpoint in endpoint_results]
    audit = Audit(
        user_id=current_user.id,
        name=data.name,
        method="OPENAPI",
        path="OpenAPI",
        description="Auditoría OpenAPI completa",
        auth_required="true",
        request_example=None,
        response_example=None,
        score=average_score,
        risk_level=global_risk_level,
        issues=json.dumps([]),
        recommendations=json.dumps([]),
        summary=observations["summary"],
        technical_observation=observations["technical_observation"],
        security_observation=observations["security_observation"],
        maintainability_observation=observations["maintainability_observation"],
        total_endpoints=len(endpoint_results),
        average_score=average_score,
        global_risk_level=global_risk_level,
        openapi_endpoints=json.dumps(endpoints_data),
    )

    try:
        db.add(audit)
        db.commit()
        db.refresh(audit)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to store OpenAPI audit. Check Alembic migrations and database schema.")
        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo guardar la auditoría OpenAPI. "
                "Revisa que la base de datos tenga las migraciones aplicadas con: "
                "python -m alembic upgrade head"
            ),
        ) from exc

    logger.info("OpenAPI audit stored: id=%s endpoints=%s", audit.id, len(endpoint_results))

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
    )
