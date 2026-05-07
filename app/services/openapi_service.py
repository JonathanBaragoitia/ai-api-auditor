import logging

from app.schemas.audit import OpenAPIEndpointAnalysis
from app.services.ai_service import analyze_with_ollama
from app.utils.scoring import calculate_risk_level

logger = logging.getLogger(__name__)


def fallback_endpoint_analysis(endpoint: dict, issue: str, recommendation: str) -> OpenAPIEndpointAnalysis:
    return OpenAPIEndpointAnalysis(
        method=endpoint.get("method", "UNKNOWN"),
        path=endpoint.get("path", "unknown"),
        summary=endpoint.get("summary"),
        score=5.0,
        risk_level="medium",
        issues=[issue],
        recommendations=[recommendation],
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
                    summary=endpoint["summary"],
                    score=score,
                    risk_level=risk_level,
                    issues=issues,
                    recommendations=recommendations,
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
