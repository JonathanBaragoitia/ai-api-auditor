import json
import logging
import os
import re

import requests


OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_TIMEOUT_SECONDS = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))

logger = logging.getLogger(__name__)


class OllamaAnalysisError(RuntimeError):
    pass


ALLOWED_SEVERITIES = {"low", "medium", "high", "critical"}
ALLOWED_CATEGORIES = {
    "security",
    "validation",
    "documentation",
    "performance",
    "rest_design",
    "maintainability",
    "observability",
}


DEFAULT_SUMMARY = "Análisis generado con criterios técnicos generales de diseño, seguridad y mantenibilidad."
DEFAULT_TECHNICAL_OBSERVATION = (
    "El endpoint debe revisarse considerando claridad del contrato, uso correcto de métodos HTTP, "
    "códigos de respuesta y consistencia REST."
)
DEFAULT_SECURITY_OBSERVATION = (
    "Conviene validar autenticación, autorización, exposición de datos sensibles y controles básicos "
    "como validación de entrada y rate limiting."
)
DEFAULT_MAINTAINABILITY_OBSERVATION = (
    "La mantenibilidad mejora con documentación clara, respuestas previsibles, ejemplos actualizados "
    "y convenciones consistentes."
)
SPANISH_OUTPUT_INSTRUCTIONS = """
Instrucciones obligatorias de idioma:
- Responde siempre en español.
- Todo el contenido generado debe estar en español profesional.
- No devuelvas explicaciones en inglés.
- Mantén términos técnicos comunes solo si son estándar: endpoint, API, OpenAPI, JWT, OAuth, rate limiting.
- Todos los valores textuales del JSON deben estar en español.
- Esto incluye summary, observations, issues y recommendations.
"""


def fallback_analysis(issue: str, recommendation: str) -> dict:
    return {
        "score": 5,
        "risk_level": "medium",
        "issues": [build_structured_issue(issue, "medium", "maintainability", issue, recommendation)],
        "recommendations": [recommendation],
        "summary": DEFAULT_SUMMARY,
        "technical_observation": DEFAULT_TECHNICAL_OBSERVATION,
        "security_observation": DEFAULT_SECURITY_OBSERVATION,
        "maintainability_observation": DEFAULT_MAINTAINABILITY_OBSERVATION,
    }


def extract_json_from_text(text: str) -> dict:
    """
    Extrae JSON aunque el modelo devuelva texto alrededor.
    Esto hace la integración más robusta.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.debug("Ollama response was not pure JSON; trying to extract JSON block.")

    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        logger.warning("Ollama response did not include a valid JSON object.")
        return fallback_analysis(
            "La IA no devolvió un JSON válido.",
            "Revisar manualmente este endpoint.",
        )

    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        logger.warning("Ollama response included a JSON-like block but parsing failed.")
        return fallback_analysis(
            "No se pudo interpretar correctamente la respuesta de la IA.",
            "Revisar manualmente este endpoint.",
        )


def normalize_risk(score: float, issues: list[str]) -> str:
    """
    Ajusta el riesgo de forma más realista.
    Si hay problemas graves de seguridad, no permitimos riesgo bajo.
    """
    issues_text = " ".join(issue_to_text(issue) for issue in issues).lower()

    security_keywords = [
        "authentication",
        "authorization",
        "autenticación",
        "autorización",
        "auth",
        "jwt",
        "api key",
        "token",
        "sensitive",
        "sensible",
        "security",
        "seguridad",
        "secure",
    ]

    has_security_issue = any(keyword in issues_text for keyword in security_keywords)

    if has_security_issue and score >= 7:
        return "medium"

    if score >= 8:
        return "low"

    if score >= 5:
        return "medium"

    return "high"


def normalize_text(value: object, default: str) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()

    return default


def build_structured_issue(
    title: object,
    severity: object = "medium",
    category: object = "maintainability",
    evidence: object | None = None,
    recommendation: object | None = None,
) -> dict[str, str]:
    normalized_title = normalize_text(title, "Problema detectado")
    normalized_severity = str(severity or "medium").lower()
    normalized_category = str(category or "maintainability").lower()

    if normalized_severity not in ALLOWED_SEVERITIES:
        normalized_severity = "medium"

    if normalized_category not in ALLOWED_CATEGORIES:
        normalized_category = "maintainability"

    return {
        "title": normalized_title,
        "severity": normalized_severity,
        "category": normalized_category,
        "evidence": normalize_text(evidence, normalized_title),
        "recommendation": normalize_text(recommendation, "Revisar y corregir este hallazgo técnico."),
    }


def normalize_issue(
    issue: object,
    default_recommendation: str = "Revisar manualmente este hallazgo.",
) -> dict[str, str]:
    if isinstance(issue, dict):
        return build_structured_issue(
            issue.get("title"),
            issue.get("severity"),
            issue.get("category"),
            issue.get("evidence"),
            issue.get("recommendation") or default_recommendation,
        )

    return build_structured_issue(
        issue,
        "medium",
        "maintainability",
        issue,
        default_recommendation,
    )


def normalize_issues(issues: object, recommendations: list[object]) -> list[dict[str, str]]:
    raw_issues = issues if isinstance(issues, list) else [issues]
    default_recommendation = next(
        (
            recommendation
            for recommendation in recommendations
            if isinstance(recommendation, str) and recommendation.strip()
        ),
        "Revisar manualmente este hallazgo.",
    )

    return [normalize_issue(issue, default_recommendation) for issue in raw_issues if issue]


def normalize_recommendations(recommendations: object) -> list[object]:
    if isinstance(recommendations, list):
        return recommendations

    if recommendations:
        return [str(recommendations)]

    return []


def issue_to_text(issue: object) -> str:
    if isinstance(issue, dict):
        return " ".join(str(value) for value in issue.values() if value)

    return str(issue)


def analyze_with_ollama(prompt: str) -> dict:
    system_prompt = f"""
    Eres un auditor senior de seguridad y arquitectura de APIs backend.

    Analiza el endpoint de API y devuelve SOLO JSON válido.

    Debes proporcionar una auditoría técnica clara, profesional y concisa.

    {SPANISH_OUTPUT_INSTRUCTIONS}

    Debes evaluar:
    - calidad del diseño REST
    - autenticación y autorización
    - paginación
    - validación de entrada
    - códigos de respuesta
    - manejo de errores
    - calidad de la documentación
    - rate limiting
    - buenas prácticas de seguridad

    Reglas de puntuación:
    - La falta de autenticación en endpoints que exponen datos de usuario debe reducir la puntuación.
    - La falta de paginación en endpoints de listado debe reducir la puntuación.
    - La falta de validación debe reducir la puntuación.
    - La documentación deficiente debe reducir la puntuación.
    - Los problemas de seguridad normalmente deben producir riesgo medio o alto.

    Los campos narrativos deben sonar como escritos por un arquitecto senior de APIs.
    Mantén cada campo narrativo breve y útil para un interlocutor técnico.

    Devuelve exactamente esta estructura JSON:

    {{
      "score": number,
      "risk_level": "low" | "medium" | "high",
      "issues": [
        {{
          "title": "título breve del problema en español",
          "severity": "low" | "medium" | "high" | "critical",
          "category": "security" | "validation" | "documentation" | "performance" | "rest_design" |
            "maintainability" | "observability",
          "evidence": "evidencia concreta observada en el endpoint en español",
          "recommendation": "acción recomendada para corregir el problema en español"
        }}
      ],
      "recommendations": ["recomendación accionable en español"],
      "summary": "resumen profesional breve del resultado de la auditoría en español",
      "technical_observation": "observación técnica clara sobre diseño y contrato de API en español",
      "security_observation": "observación de seguridad clara sobre controles en español",
      "maintainability_observation": "observación sobre documentación, consistencia y evolución en español"
    }}

    No incluyas markdown.
    No incluyas explicaciones fuera del JSON.
    Solo JSON.
    """

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": f"{system_prompt}\n\n{prompt}",
        "stream": False,
    }

    try:
        logger.info(
            "Sending request to Ollama: url=%s model=%s timeout=%s",
            OLLAMA_URL,
            OLLAMA_MODEL,
            OLLAMA_TIMEOUT_SECONDS,
        )
        logger.debug(
            "Ollama request payload keys=%s prompt_length=%s",
            list(payload.keys()),
            len(payload["prompt"]),
        )
        response = requests.post(OLLAMA_URL, json=payload, timeout=OLLAMA_TIMEOUT_SECONDS)
        logger.info("Ollama response status_code=%s", response.status_code)
        logger.debug("Ollama response body preview=%s", response.text[:1000])
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Ollama request failed: %s", exc, exc_info=True)
        raise OllamaAnalysisError(f"No se pudo conectar con Ollama: {exc}") from exc

    try:
        response_data = response.json()
        raw_text = response_data.get("response", "")
        logger.debug(
            "Ollama parsed response keys=%s response_length=%s",
            list(response_data.keys()),
            len(raw_text),
        )
    except ValueError as exc:
        logger.warning("Ollama returned a non-JSON HTTP response: %s", exc, exc_info=True)
        raise OllamaAnalysisError("Ollama devolvió una respuesta HTTP no válida.") from exc

    analysis = extract_json_from_text(raw_text)

    try:
        score = float(analysis.get("score", 5))
    except (TypeError, ValueError):
        logger.warning("Ollama returned an invalid score: %r", analysis.get("score"))
        score = 5

    recommendations = normalize_recommendations(analysis.get("recommendations", []))
    issues = normalize_issues(analysis.get("issues", []), recommendations)

    risk_level = normalize_risk(score, issues)

    return {
        "score": round(score, 1),
        "risk_level": risk_level,
        "issues": issues,
        "recommendations": recommendations,
        "summary": normalize_text(analysis.get("summary"), DEFAULT_SUMMARY),
        "technical_observation": normalize_text(
            analysis.get("technical_observation"),
            DEFAULT_TECHNICAL_OBSERVATION,
        ),
        "security_observation": normalize_text(
            analysis.get("security_observation"),
            DEFAULT_SECURITY_OBSERVATION,
        ),
        "maintainability_observation": normalize_text(
            analysis.get("maintainability_observation"),
            DEFAULT_MAINTAINABILITY_OBSERVATION,
        ),
    }
