import json

from app.schemas.audit import AuditAnalysis, ManualAuditRequest
from app.services.ai_service import (
    DEFAULT_MAINTAINABILITY_OBSERVATION,
    DEFAULT_SECURITY_OBSERVATION,
    DEFAULT_TECHNICAL_OBSERVATION,
    build_structured_issue,
)
from app.utils.scoring import calculate_risk_level


def analyze_manual_audit(data: ManualAuditRequest) -> AuditAnalysis:
    score = 10.0
    issues: list[dict[str, str]] = []
    recommendations: list[str] = []

    method = data.method.upper()

    if not data.auth_required:
        score -= 2
        recommendation = "Añadir autenticación, por ejemplo JWT o API Key."
        issues.append(
            build_structured_issue(
                "Falta autenticación",
                "high",
                "security",
                f"{method} {data.path} no requiere autenticación.",
                recommendation,
            )
        )
        recommendations.append(recommendation)

    if method == "GET" and data.response_example:
        response_text = json.dumps(data.response_example).lower()

        if "list" in response_text or "users" in response_text or "[" in response_text:
            if "page" not in response_text and "limit" not in response_text:
                score -= 1.5
                recommendation = "Añadir paginación con parámetros como page, limit o offset."
                issues.append(
                    build_structured_issue(
                        "Falta paginación",
                        "medium",
                        "performance",
                        "La respuesta parece devolver un listado sin metadatos o parámetros de paginación.",
                        recommendation,
                    )
                )
                recommendations.append(recommendation)

    if not data.description:
        score -= 1
        recommendation = "Añadir una descripción clara del propósito del endpoint."
        issues.append(
            build_structured_issue(
                "Falta descripción funcional",
                "low",
                "documentation",
                "La auditoría manual no incluye una descripción funcional del endpoint.",
                recommendation,
            )
        )
        recommendations.append(recommendation)

    if not data.path.startswith("/"):
        score -= 1
        recommendation = "Usar rutas REST claras, por ejemplo /users o /reports."
        issues.append(
            build_structured_issue(
                "Ruta REST inválida",
                "medium",
                "rest_design",
                f"La ruta {data.path} no empieza por '/'.",
                recommendation,
            )
        )
        recommendations.append(recommendation)

    if method not in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
        score -= 1
        recommendation = "Usar métodos HTTP estándar como GET, POST, PUT, PATCH o DELETE."
        issues.append(
            build_structured_issue(
                "Método HTTP no estándar",
                "medium",
                "rest_design",
                f"El método {method} no pertenece al conjunto HTTP esperado para APIs REST.",
                recommendation,
            )
        )
        recommendations.append(recommendation)

    if score < 0:
        score = 0

    score = round(score, 1)
    risk_level = calculate_risk_level(score)

    if not issues:
        recommendation = "Mantener buenas prácticas de documentación, seguridad y testing."
        issues.append(
            build_structured_issue(
                "Sin problemas relevantes",
                "low",
                "maintainability",
                "No se han detectado problemas importantes con las reglas actuales.",
                recommendation,
            )
        )
        recommendations.append(recommendation)

    return AuditAnalysis(
        score=score,
        risk_level=risk_level,
        issues=issues,
        recommendations=recommendations,
        summary=(
            f"Auditoría manual de {method} {data.path} con puntuación {score}/10 y riesgo {risk_level}."
        ),
        technical_observation=DEFAULT_TECHNICAL_OBSERVATION,
        security_observation=DEFAULT_SECURITY_OBSERVATION,
        maintainability_observation=DEFAULT_MAINTAINABILITY_OBSERVATION,
    )
