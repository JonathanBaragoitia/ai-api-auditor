import logging

from app.schemas.audit import OpenAPIEndpointAnalysis
from app.services.ai_service import (
    DEFAULT_MAINTAINABILITY_OBSERVATION,
    DEFAULT_SECURITY_OBSERVATION,
    DEFAULT_SUMMARY,
    DEFAULT_TECHNICAL_OBSERVATION,
    analyze_with_ollama,
)
from app.utils.scoring import calculate_risk_level

logger = logging.getLogger(__name__)


def fallback_endpoint_analysis(
    endpoint: dict,
    issue: str,
    recommendation: str,
) -> OpenAPIEndpointAnalysis:
    return OpenAPIEndpointAnalysis(
        method=endpoint.get("method", "UNKNOWN"),
        path=endpoint.get("path", "unknown"),
        summary=endpoint.get("summary"),
        score=5.0,
        risk_level="medium",
        issues=[issue],
        recommendations=[recommendation],
        technical_observation=DEFAULT_TECHNICAL_OBSERVATION,
        security_observation=DEFAULT_SECURITY_OBSERVATION,
        maintainability_observation=DEFAULT_MAINTAINABILITY_OBSERVATION,
    )


def extract_openapi_endpoints(openapi_schema: dict) -> list[dict]:
    # Se ignoran métodos no REST para mantener un scoring consistente.
    paths = openapi_schema.get("paths", {})

    if not isinstance(paths, dict):
        logger.warning("OpenAPI schema has no valid paths object.")
        return []

    endpoints = []

    valid_methods = {"get", "post", "put", "patch", "delete"}

    for path, methods in paths.items():
        if not isinstance(methods, dict):
            logger.warning("Skipping invalid OpenAPI path item for path %s", path)
            continue

        for method, details in methods.items():
            if method.lower() not in valid_methods:
                continue

            if not isinstance(details, dict):
                logger.warning("Skipping invalid OpenAPI operation %s %s", method, path)
                continue

            endpoints.append(
                {
                    "method": method.upper(),
                    "path": path,
                    "summary": details.get("summary") or details.get("description"),
                    "security": details.get("security"),
                    "parameters": details.get("parameters", []),
                    "responses": details.get("responses", {}),
                }
            )

    return endpoints


def analyze_openapi_schema(openapi_schema: dict) -> list[OpenAPIEndpointAnalysis]:
    endpoints = extract_openapi_endpoints(openapi_schema)

    results = []

    for endpoint in endpoints:
        prompt = f"""
        Analiza este endpoint definido en OpenAPI:

        Método: {endpoint["method"]}
        Ruta: {endpoint["path"]}
        Resumen: {endpoint["summary"]}
        Seguridad: {endpoint["security"]}
        Parámetros: {endpoint["parameters"]}
        Respuestas: {endpoint["responses"]}

        Evalúa diseño REST, seguridad, paginación, documentación y buenas prácticas.
        """

        try:
            analysis = analyze_with_ollama(prompt)
            score = float(analysis.get("score", 5))
            risk_level = analysis.get("risk_level") or "medium"
            issues = analysis.get("issues", [])
            recommendations = analysis.get("recommendations", [])

            if not isinstance(issues, list):
                issues = [str(issues)]

            if not isinstance(recommendations, list):
                recommendations = [str(recommendations)]

            results.append(
                OpenAPIEndpointAnalysis(
                    method=endpoint["method"],
                    path=endpoint["path"],
                    summary=analysis.get("summary") or endpoint["summary"] or DEFAULT_SUMMARY,
                    score=score,
                    risk_level=risk_level,
                    issues=issues,
                    recommendations=recommendations,
                    technical_observation=(
                        analysis.get("technical_observation") or DEFAULT_TECHNICAL_OBSERVATION
                    ),
                    security_observation=analysis.get("security_observation") or DEFAULT_SECURITY_OBSERVATION,
                    maintainability_observation=(
                        analysis.get("maintainability_observation") or DEFAULT_MAINTAINABILITY_OBSERVATION
                    ),
                )
            )
        except Exception as exc:
            logger.exception("OpenAPI endpoint analysis failed for %s %s", endpoint["method"], endpoint["path"])
            results.append(
                fallback_endpoint_analysis(
                    endpoint,
                    "No se pudo analizar este endpoint por un error interno del análisis IA.",
                    f"Revisar logs del backend. Detalle técnico: {exc}",
                )
            )

    return results


def calculate_global_audit_result(results: list[OpenAPIEndpointAnalysis]) -> tuple[float, str]:
    if not results:
        return 0.0, "high"

    average_score = round(
        sum(endpoint.score for endpoint in results) / len(results),
        1,
    )

    global_risk_level = calculate_risk_level(average_score)

    return average_score, global_risk_level


def build_global_observations(results: list[OpenAPIEndpointAnalysis]) -> dict[str, str]:
    if not results:
        return {
            "summary": "No se detectaron endpoints analizables en el documento OpenAPI.",
            "technical_observation": DEFAULT_TECHNICAL_OBSERVATION,
            "security_observation": DEFAULT_SECURITY_OBSERVATION,
            "maintainability_observation": DEFAULT_MAINTAINABILITY_OBSERVATION,
        }

    high_risk_count = sum(1 for endpoint in results if endpoint.risk_level == "high")
    medium_risk_count = sum(1 for endpoint in results if endpoint.risk_level == "medium")

    return {
        "summary": (
            f"Se analizaron {len(results)} endpoints. La auditoría identifica "
            f"{high_risk_count} endpoints de riesgo alto y {medium_risk_count} de riesgo medio."
        ),
        "technical_observation": (
            "La calidad técnica global debe evaluarse por consistencia REST, claridad del contrato, "
            "códigos de respuesta documentados y comportamiento previsible entre endpoints."
        ),
        "security_observation": (
            "La revisión de seguridad debe priorizar autenticación, autorización, exposición de datos "
            "sensibles y controles operativos como validación de entrada y rate limiting."
        ),
        "maintainability_observation": (
            "La mantenibilidad depende de documentación OpenAPI completa, nombres consistentes y contratos "
            "estables que faciliten evolución, testing e integración por terceros."
        ),
    }
