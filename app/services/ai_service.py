import json
import logging
import os
import re

import requests


OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_TIMEOUT_SECONDS = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))

logger = logging.getLogger(__name__)


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


def fallback_analysis(issue: str, recommendation: str) -> dict:
    return {
        "score": 5,
        "risk_level": "medium",
        "issues": [issue],
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
    issues_text = " ".join(issues).lower()

    security_keywords = [
        "authentication",
        "authorization",
        "auth",
        "jwt",
        "api key",
        "token",
        "sensitive",
        "security",
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


def analyze_with_ollama(prompt: str) -> dict:
    system_prompt = """
    You are a senior backend API security auditor.

    Analyze the API endpoint and return ONLY valid JSON.

    You must provide a clear, professional, concise technical audit.

    You must evaluate:
    - REST design quality
    - authentication and authorization
    - pagination
    - input validation
    - response codes
    - error handling
    - documentation quality
    - rate limiting
    - security best practices

    Scoring rules:
    - Missing authentication on endpoints that expose user data must reduce score.
    - Missing pagination on list endpoints must reduce score.
    - Missing validation must reduce score.
    - Poor documentation must reduce score.
    - Security issues should normally result in medium or high risk.

    Narrative fields must sound like a senior API architect wrote them.
    Keep each narrative field brief and useful for a technical stakeholder.

    Return exactly this JSON structure:

    {
      "score": number,
      "risk_level": "low" | "medium" | "high",
      "issues": ["string"],
      "recommendations": ["string"],
      "summary": "brief professional summary of the audit result",
      "technical_observation": "clear technical observation about API design and contract quality",
      "security_observation": "clear security observation about auth, data exposure or controls",
      "maintainability_observation": "clear maintainability observation about documentation, consistency and evolution"
    }

    Do not include markdown.
    Do not include explanations.
    Only JSON.
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
        return fallback_analysis(
            "No se pudo conectar con Ollama.",
            "Comprueba que Ollama está encendido y que el modelo está descargado.",
        )

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
        return fallback_analysis(
            "Ollama devolvió una respuesta HTTP no válida.",
            "Revisar que Ollama y el modelo configurado estén funcionando correctamente.",
        )

    analysis = extract_json_from_text(raw_text)

    try:
        score = float(analysis.get("score", 5))
    except (TypeError, ValueError):
        logger.warning("Ollama returned an invalid score: %r", analysis.get("score"))
        score = 5

    issues = analysis.get("issues", [])
    recommendations = analysis.get("recommendations", [])

    if not isinstance(issues, list):
        issues = [str(issues)]

    if not isinstance(recommendations, list):
        recommendations = [str(recommendations)]

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
