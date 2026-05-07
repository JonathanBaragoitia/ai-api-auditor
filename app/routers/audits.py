import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.db.database import get_db
from app.models.audit import Audit
from app.models.user import User
from app.services.audit_service import analyze_manual_audit
from app.services.ai_service import analyze_with_ollama
from app.services.openapi_service import analyze_openapi_schema, calculate_global_audit_result
from app.schemas.audit import (
    AuditResponse,
    ManualAuditRequest,
    OpenAPIAuditRequest,
    OpenAPIAuditResponse,
)


router = APIRouter(prefix="/audits", tags=["Audits"])


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
        created_at=audit.created_at,
    )


@router.get("/", response_model=list[AuditResponse])
def get_audits(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    audits = db.query(Audit).order_by(Audit.created_at.desc()).all()
    return [parse_audit(audit) for audit in audits]


@router.get("/{audit_id}", response_model=AuditResponse)
def get_audit(audit_id: int, db: Session = Depends(get_db)):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()

    if not audit:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada.")

    return parse_audit(audit)


@router.post("/manual", response_model=AuditResponse, status_code=201)
def create_manual_audit(
    data: ManualAuditRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    # El usuario autenticado se inyecta para forzar control de acceso,
    # aunque no se use explícitamente en la lógica de scoring.
    analysis = analyze_manual_audit(data)

    audit = Audit(
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
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return parse_audit(audit)


@router.post("/ai-test")
def ai_test():
    prompt = """
    Endpoint:
    GET /users

    No tiene autenticación.
    Devuelve lista de usuarios.
    """

    result = analyze_with_ollama(prompt)

    return result


@router.post("/manual-ai", response_model=AuditResponse, status_code=201)
def create_manual_ai_audit(data: ManualAuditRequest, db: Session = Depends(get_db)):
    prompt = f"""
    Endpoint:
    {data.method} {data.path}

    Descripción:
    {data.description}

    Autenticación requerida:
    {data.auth_required}

    Ejemplo de request:
    {data.request_example}

    Ejemplo de response:
    {data.response_example}

    Analiza este endpoint y devuelve una auditoría técnica.
    """

    analysis = analyze_with_ollama(prompt)

    if "error" in analysis:
        raise HTTPException(status_code=500, detail="Error en el análisis con IA.")

    audit = Audit(
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
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return parse_audit(audit)


@router.post("/openapi", response_model=OpenAPIAuditResponse)
def create_openapi_audit(
    data: OpenAPIAuditRequest,
    _current_user: User = Depends(get_current_user),
):
    # Este flujo no persiste resultados; devuelve análisis agregado en tiempo real.
    endpoint_results = analyze_openapi_schema(data.openapi_schema)

    average_score, global_risk_level = calculate_global_audit_result(endpoint_results)

    return OpenAPIAuditResponse(
        name=data.name,
        total_endpoints=len(endpoint_results),
        average_score=average_score,
        global_risk_level=global_risk_level,
        endpoints=endpoint_results,
    )


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    audits = db.query(Audit).order_by(Audit.created_at.desc()).all()
    return [parse_audit(audit) for audit in audits]
