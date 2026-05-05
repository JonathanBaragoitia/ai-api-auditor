import json

from app.schemas.audit import AuditAnalysis, ManualAuditRequest
from app.utils.scoring import calculate_risk_level


def analyze_manual_audit(data: ManualAuditRequest) -> AuditAnalysis:
    score = 10.0
    issues: list[str] = []
    recommendations: list[str] = []

    method = data.method.upper()

    if not data.auth_required:
        score -= 2
        issues.append("El endpoint no requiere autenticación.")
        recommendations.append("Añadir autenticación, por ejemplo JWT o API Key.")

    if method == "GET" and data.response_example:
        response_text = json.dumps(data.response_example).lower()

        if "list" in response_text or "users" in response_text or "[" in response_text:
            if "page" not in response_text and "limit" not in response_text:
                score -= 1.5
                issues.append("No se detecta paginación en una respuesta tipo listado.")
                recommendations.append("Añadir paginación con parámetros como page, limit o offset.")

    if not data.description:
        score -= 1
        issues.append("El endpoint no tiene descripción funcional.")
        recommendations.append("Añadir una descripción clara del propósito del endpoint.")

    if not data.path.startswith("/"):
        score -= 1
        issues.append("La ruta no empieza por '/'.")
        recommendations.append("Usar rutas REST claras, por ejemplo /users o /reports.")

    if method not in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
        score -= 1
        issues.append("El método HTTP no es estándar.")
        recommendations.append("Usar métodos HTTP estándar como GET, POST, PUT, PATCH o DELETE.")

    if score < 0:
        score = 0

    score = round(score, 1)
    risk_level = calculate_risk_level(score)

    if not issues:
        issues.append("No se han detectado problemas importantes.")
        recommendations.append("Mantener buenas prácticas de documentación, seguridad y testing.")

    return AuditAnalysis(
        score=score,
        risk_level=risk_level,
        issues=issues,
        recommendations=recommendations,
    )