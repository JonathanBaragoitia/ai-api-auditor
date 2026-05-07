from app.schemas.audit import OpenAPIEndpointAnalysis
from app.services.ai_service import analyze_with_ollama
from app.utils.scoring import calculate_risk_level


def extract_openapi_endpoints(openapi_schema: dict) -> list[dict]:
    # Se ignoran métodos no REST para mantener un scoring consistente.
    paths = openapi_schema.get("paths", {})
    endpoints = []

    valid_methods = {"get", "post", "put", "patch", "delete"}

    for path, methods in paths.items():
        for method, details in methods.items():
            if method.lower() not in valid_methods:
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

        analysis = analyze_with_ollama(prompt)

        if "error" in analysis:
            # Fallback defensivo: evita romper toda la auditoría
            # cuando la IA no responde en formato utilizable.
            analysis = {
                "score": 5,
                "risk_level": "medium",
                "issues": ["No se pudo obtener un análisis estructurado de la IA."],
                "recommendations": ["Revisar manualmente este endpoint."],
            }

        results.append(
            OpenAPIEndpointAnalysis(
                method=endpoint["method"],
                path=endpoint["path"],
                summary=endpoint["summary"],
                score=float(analysis["score"]),
                risk_level=analysis["risk_level"],
                issues=analysis["issues"],
                recommendations=analysis["recommendations"],
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
