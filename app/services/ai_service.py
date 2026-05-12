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
ALLOWED_FIX_PRIORITIES = {"baja", "media", "alta"}
ALLOWED_CATEGORIES = {
    "security",
    "validation",
    "documentation",
    "performance",
    "rest_design",
    "maintainability",
    "observability",
}
MAX_ISSUES = 6
MAX_RECOMMENDATIONS = 6
TEXT_LIMITS = {
    "summary": 180,
    "observation": 240,
    "issue_title": 90,
    "issue_evidence": 180,
    "recommendation": 150,
    "fix_title": 90,
    "fix_explanation": 220,
    "fix_example": 600,
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


def normalize_plain_text(value: object) -> str:
    # Limpia saltos y espacios repetidos para que el frontend/exportaciones reciban texto compacto.
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    replacements = {
        "missing authentication": "falta autenticación",
        "authentication missing": "falta autenticación",
        "missing pagination": "falta paginación",
        "add pagination": "añadir paginación",
        "rate limit": "rate limiting",
        "error handling": "manejo de errores",
        "sensitive data": "datos sensibles",
        "security scheme": "esquema de seguridad",
    }
    for source, target in replacements.items():
        text = re.sub(source, target, text, flags=re.IGNORECASE)
    return text


def trim_text(value: object, max_chars: int) -> str:
    # Limita longitud sin cortar agresivamente si hay una frase completa cerca del límite.
    text = normalize_plain_text(value)
    if len(text) <= max_chars:
        return text

    cutoff = text[:max_chars].rsplit(". ", 1)[0]
    if len(cutoff) >= max_chars * 0.55:
        return cutoff.rstrip(" .") + "."

    return text[: max_chars - 1].rstrip(" ,.;") + "…"


def text_fingerprint(value: object) -> set[str]:
    # Reduce el texto a tokens significativos para comparar similitud sin depender de igualdad exacta.
    words = re.findall(r"[a-záéíóúñü0-9]{4,}", normalize_plain_text(value).lower())
    stopwords = {
        "para",
        "como",
        "este",
        "esta",
        "debe",
        "deben",
        "endpoint",
        "endpoints",
        "auditoría",
        "revisar",
        "mejorar",
        "implementar",
    }
    return {word for word in words if word not in stopwords}


def are_texts_similar(first: object, second: object, threshold: float = 0.7) -> bool:
    first_text = normalize_plain_text(first).lower()
    second_text = normalize_plain_text(second).lower()

    if not first_text or not second_text:
        return False

    if first_text == second_text or first_text in second_text or second_text in first_text:
        return True

    first_tokens = text_fingerprint(first_text)
    second_tokens = text_fingerprint(second_text)
    if not first_tokens or not second_tokens:
        return False

    overlap = len(first_tokens & second_tokens) / len(first_tokens | second_tokens)
    return overlap >= threshold


def is_redundant_text(value: object, previous_values: list[object]) -> bool:
    # Evita que resumen, observaciones, issues y recomendaciones repitan la misma idea con otras palabras.
    return any(are_texts_similar(value, previous) for previous in previous_values if previous)


def compact_distinct_text(value: object, default: str, previous_values: list[object], max_chars: int) -> str:
    text = trim_text(normalize_text(value, default), max_chars)
    if not is_redundant_text(text, previous_values):
        return text

    fallback = trim_text(default, max_chars)
    return "" if is_redundant_text(fallback, previous_values) else fallback


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
    fix_suggestion: object | None = None,
) -> dict[str, object]:
    normalized_title = trim_text(normalize_text(title, "Problema detectado"), TEXT_LIMITS["issue_title"])
    normalized_severity = str(severity or "medium").lower()
    normalized_category = str(category or "maintainability").lower()

    if normalized_severity not in ALLOWED_SEVERITIES:
        normalized_severity = "medium"

    if normalized_category not in ALLOWED_CATEGORIES:
        normalized_category = "maintainability"

    normalized_recommendation = trim_text(
        normalize_text(recommendation, "Corregir este hallazgo técnico."),
        TEXT_LIMITS["recommendation"],
    )

    return {
        "title": normalized_title,
        "severity": normalized_severity,
        "category": normalized_category,
        "evidence": trim_text(normalize_text(evidence, normalized_title), TEXT_LIMITS["issue_evidence"]),
        "recommendation": normalized_recommendation,
        "fix_suggestion": normalize_fix_suggestion(
            fix_suggestion,
            normalized_title,
            normalized_recommendation,
            normalized_severity,
        ),
    }


def normalize_fix_priority(value: object, severity: str) -> str:
    priority = normalize_plain_text(value).lower()
    if priority in ALLOWED_FIX_PRIORITIES:
        return priority
    if severity in {"critical", "high"}:
        return "alta"
    if severity == "low":
        return "baja"
    return "media"


def normalize_fix_suggestion(
    value: object,
    issue_title: str,
    default_recommendation: str,
    severity: str,
) -> dict[str, object]:
    # Cada issue mantiene una sugerencia autocontenida. Si la IA no incluye ejemplos,
    # devolvemos una guía textual clara sin forzar código inventado.
    if isinstance(value, dict):
        title = value.get("title") or value.get("titulo") or f"Corregir: {issue_title}"
        explanation = value.get("explanation") or value.get("explicacion") or default_recommendation
        openapi_example = value.get("openapi_example") or value.get("ejemplo_openapi")
        error_response_example = value.get("error_response_example") or value.get("ejemplo_error")
        priority = value.get("priority") or value.get("prioridad")
    else:
        title = f"Corregir: {issue_title}"
        explanation = value or default_recommendation
        openapi_example = None
        error_response_example = None
        priority = None

    return {
        "title": trim_text(title, TEXT_LIMITS["fix_title"]),
        "explanation": trim_text(explanation, TEXT_LIMITS["fix_explanation"]),
        "openapi_example": trim_text(openapi_example, TEXT_LIMITS["fix_example"]) if openapi_example else None,
        "error_response_example": (
            trim_text(error_response_example, TEXT_LIMITS["fix_example"]) if error_response_example else None
        ),
        "priority": normalize_fix_priority(priority, severity),
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
            issue.get("fix_suggestion") or issue.get("fixSuggestion"),
        )

    return build_structured_issue(
        issue,
        "medium",
        "maintainability",
        issue,
        default_recommendation,
        None,
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

    normalized = []
    seen = []

    for issue in raw_issues:
        if not issue or len(normalized) >= MAX_ISSUES:
            continue

        normalized_issue = normalize_issue(issue, default_recommendation)
        signature = " ".join(
            [normalized_issue["title"], normalized_issue["evidence"], normalized_issue["recommendation"]]
        )
        if is_redundant_text(signature, seen):
            continue

        seen.append(signature)
        normalized.append(normalized_issue)

    return normalized


def normalize_recommendations(recommendations: object) -> list[object]:
    if isinstance(recommendations, list):
        raw_recommendations = recommendations
    elif recommendations:
        raw_recommendations = [recommendations]
    else:
        raw_recommendations = []

    normalized = []
    for recommendation in raw_recommendations:
        text = recommendation_to_text(recommendation)
        text = trim_text(text, TEXT_LIMITS["recommendation"])
        if text and not is_redundant_text(text, normalized):
            normalized.append(text)
        if len(normalized) >= MAX_RECOMMENDATIONS:
            break

    return normalized


def recommendation_to_text(value: object) -> str:
    if isinstance(value, str):
        return normalize_plain_text(value)

    if isinstance(value, dict):
        return normalize_plain_text(
            value.get("recommendation") or value.get("title") or value.get("description") or ""
        )

    return normalize_plain_text(value)


def issue_to_text(issue: object) -> str:
    if isinstance(issue, dict):
        return " ".join(str(value) for value in issue.values() if value)

    return str(issue)


def issue_recommendations(issues: list[dict[str, str]]) -> list[str]:
    return [issue.get("recommendation", "") for issue in issues if isinstance(issue, dict)]


def refine_recommendations(recommendations: list[object], issues: list[dict[str, str]]) -> list[str]:
    # Las recomendaciones globales no deben duplicar la recomendación específica de cada issue.
    issue_texts = [issue_to_text(issue) for issue in issues] + issue_recommendations(issues)
    refined = []

    for recommendation in recommendations:
        text = trim_text(recommendation_to_text(recommendation), TEXT_LIMITS["recommendation"])
        if text and not is_redundant_text(text, issue_texts + refined):
            refined.append(text)

    return refined[:MAX_RECOMMENDATIONS]


def build_distinct_narrative_fields(analysis: dict, issues: list[dict[str, str]], recommendations: list[str]) -> dict:
    # Orden editorial: el resumen abre la lectura; cada observación se compara con lo anterior
    # para que no repita problemas ni recomendaciones ya listadas.
    issue_context = [issue_to_text(issue) for issue in issues]
    recommendation_context = list(recommendations)

    summary = compact_distinct_text(
        analysis.get("summary"),
        DEFAULT_SUMMARY,
        [],
        TEXT_LIMITS["summary"],
    )
    technical = compact_distinct_text(
        analysis.get("technical_observation"),
        DEFAULT_TECHNICAL_OBSERVATION,
        [summary] + issue_context + recommendation_context,
        TEXT_LIMITS["observation"],
    )
    security = compact_distinct_text(
        analysis.get("security_observation"),
        DEFAULT_SECURITY_OBSERVATION,
        [summary, technical] + issue_context + recommendation_context,
        TEXT_LIMITS["observation"],
    )
    maintainability = compact_distinct_text(
        analysis.get("maintainability_observation"),
        DEFAULT_MAINTAINABILITY_OBSERVATION,
        [summary, technical, security] + issue_context + recommendation_context,
        TEXT_LIMITS["observation"],
    )

    return {
        "summary": summary,
        "technical_observation": technical,
        "security_observation": security,
        "maintainability_observation": maintainability,
    }


def analyze_with_ollama(prompt: str) -> dict:
    system_prompt = f"""
    Eres un auditor senior de seguridad y arquitectura de APIs backend.

    Analiza el endpoint de API y devuelve SOLO JSON válido.

    Debes proporcionar una auditoría técnica clara, profesional y concisa, sin tono genérico.

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

    Organización editorial obligatoria:
    - summary: máximo 2 frases, ejecutivo, sin repetir problemas ni recomendaciones textuales.
    - technical_observation: solo diseño de contrato, métodos, parámetros, responses y consistencia técnica.
    - security_observation: solo autenticación, autorización, exposición de datos, rate limiting y errores sensibles.
    - maintainability_observation: solo documentación, evolución, observabilidad, escalabilidad y mantenibilidad.
    - issues: hallazgos concretos y verificables; evita títulos genéricos.
    - recommendations: frases cortas, directas y accionables; no repitas recomendaciones ya incluidas en issues.
    - fix_suggestion: solución técnica concreta para cada issue; incluye ejemplos solo si son aplicables.

    Reglas anti-repetición:
    - No uses la misma frase en dos campos.
    - No repitas el summary en las observaciones.
    - No conviertas un issue y una recomendación global en el mismo texto.
    - Si no hay evidencia para una sección, escribe una observación breve y específica, no relleno.

    Límites de longitud:
    - summary: hasta 180 caracteres.
    - cada observación: hasta 240 caracteres.
    - cada title/evidence/recommendation: una frase breve.
    - cada fix_suggestion debe ser práctico, breve y directamente implementable.

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
          "recommendation": "acción recomendada para corregir el problema en español",
          "fix_suggestion": {{
            "title": "título breve de la solución en español",
            "explanation": "explicación breve de cómo aplicar la corrección",
            "openapi_example": "fragmento OpenAPI recomendado si aplica; null si no aplica",
            "error_response_example": "ejemplo JSON de respuesta de error si aplica; null si no aplica",
            "priority": "baja" | "media" | "alta"
          }}
        }}
      ],
      "recommendations": ["recomendación accionable en español"],
      "summary": "resumen ejecutivo breve y no repetitivo en español",
      "technical_observation": "observación solo técnica sobre contrato, métodos, responses o consistencia",
      "security_observation": "observación solo de seguridad sobre controles, exposición o errores sensibles",
      "maintainability_observation": "observación solo sobre documentación, evolución, observabilidad o escalabilidad"
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
    recommendations = refine_recommendations(recommendations, issues)
    narrative_fields = build_distinct_narrative_fields(analysis, issues, recommendations)

    risk_level = normalize_risk(score, issues)

    return {
        "score": round(score, 1),
        "risk_level": risk_level,
        "issues": issues,
        "recommendations": recommendations,
        **narrative_fields,
    }
