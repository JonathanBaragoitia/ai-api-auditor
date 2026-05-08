import json
import logging

from app.core.config import settings
from app.schemas.audit import OpenAPIEndpointAnalysis
from app.services.ai_service import (
    DEFAULT_MAINTAINABILITY_OBSERVATION,
    DEFAULT_SECURITY_OBSERVATION,
    DEFAULT_SUMMARY,
    DEFAULT_TECHNICAL_OBSERVATION,
    SPANISH_OUTPUT_INSTRUCTIONS,
    analyze_with_ollama,
    build_structured_issue,
    normalize_issues,
    normalize_recommendations,
)
from app.utils.scoring import calculate_risk_level

logger = logging.getLogger(__name__)
VALID_REST_METHODS = {"get", "post", "put", "patch", "delete"}


class OpenAPIValidationError(ValueError):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def fallback_endpoint_analysis(
    endpoint: dict,
    issue: str,
    recommendation: str,
) -> OpenAPIEndpointAnalysis:
    return OpenAPIEndpointAnalysis(
        method=endpoint.get("method", "UNKNOWN"),
        path=endpoint.get("path", "unknown"),
        summary=DEFAULT_SUMMARY,
        score=5.0,
        risk_level="medium",
        issues=[build_structured_issue(issue, "medium", "maintainability", issue, recommendation)],
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

    for path, methods in paths.items():
        if not isinstance(methods, dict):
            logger.warning("Skipping invalid OpenAPI path item for path %s", path)
            continue

        for method, details in methods.items():
            if method.lower() not in VALID_REST_METHODS:
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


def validate_openapi_schema(openapi_schema: dict) -> list[dict]:
    try:
        schema_size = len(json.dumps(openapi_schema, ensure_ascii=False))
    except (TypeError, ValueError) as exc:
        raise OpenAPIValidationError("El documento OpenAPI no se pudo serializar como JSON válido.") from exc

    if schema_size > settings.MAX_OPENAPI_SIZE_CHARS:
        raise OpenAPIValidationError(
            (
                "El documento OpenAPI supera el tamaño máximo permitido "
                f"({settings.MAX_OPENAPI_SIZE_CHARS} caracteres)."
            ),
            status_code=413,
        )

    if "paths" not in openapi_schema:
        raise OpenAPIValidationError("El documento OpenAPI debe incluir el campo 'paths'.")

    paths = openapi_schema.get("paths")
    if not isinstance(paths, dict):
        raise OpenAPIValidationError("El campo 'paths' del documento OpenAPI debe ser un objeto.")

    endpoints = extract_openapi_endpoints(openapi_schema)

    if not endpoints:
        raise OpenAPIValidationError("El documento OpenAPI debe incluir al menos un endpoint válido.")

    if len(endpoints) > settings.MAX_OPENAPI_ENDPOINTS:
        raise OpenAPIValidationError(
            (
                "El documento OpenAPI supera el número máximo de endpoints permitidos "
                f"({settings.MAX_OPENAPI_ENDPOINTS})."
            )
        )

    for path, methods in paths.items():
        if not isinstance(methods, dict):
            continue

        operation_count = sum(1 for method in methods if method.lower() in VALID_REST_METHODS)
        if operation_count > settings.MAX_OPENAPI_OPERATIONS_PER_PATH:
            raise OpenAPIValidationError(
                (
                    f"El path '{path}' supera el máximo de operaciones permitidas "
                    f"({settings.MAX_OPENAPI_OPERATIONS_PER_PATH})."
                )
            )

    return endpoints


def analyze_openapi_schema(openapi_schema: dict, endpoints: list[dict] | None = None) -> list[OpenAPIEndpointAnalysis]:
    endpoints = endpoints if endpoints is not None else extract_openapi_endpoints(openapi_schema)

    results = []

    for endpoint in endpoints:
        prompt = f"""
        Analiza este endpoint definido en OpenAPI:

        {SPANISH_OUTPUT_INSTRUCTIONS}

        Método: {endpoint["method"]}
        Ruta: {endpoint["path"]}
        Resumen original de OpenAPI: {endpoint["summary"]}
        Seguridad: {endpoint["security"]}
        Parámetros: {endpoint["parameters"]}
        Respuestas: {endpoint["responses"]}

        Evalúa diseño REST, seguridad, paginación, documentación y buenas prácticas.
        Si el resumen original está en inglés, genera un summary en español profesional.
        Devuelve issues estructurados, recommendations y observaciones narrativas siempre en español.
        Cada issue debe incluir title, severity, category, evidence y recommendation.
        """

        try:
            analysis = analyze_with_ollama(prompt)
            try:
                score = float(analysis.get("score", 5))
            except (TypeError, ValueError):
                logger.warning("Ollama returned an invalid score for %s %s", endpoint["method"], endpoint["path"])
                score = 5.0
            risk_level = analysis.get("risk_level") or "medium"
            recommendations = normalize_recommendations(analysis.get("recommendations", []))
            issues = normalize_issues(analysis.get("issues", []), recommendations)

            results.append(
                OpenAPIEndpointAnalysis(
                    method=endpoint["method"],
                    path=endpoint["path"],
                    summary=analysis.get("summary") or DEFAULT_SUMMARY,
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
