import json
import re

import requests


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3"


def extract_json_from_text(text: str) -> dict:
    """
    Extrae JSON aunque el modelo devuelva texto alrededor.
    Esto hace la integración más robusta.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        return {
            "score": 5,
            "risk_level": "medium",
            "issues": ["La IA no devolvió un JSON válido."],
            "recommendations": ["Revisar manualmente este endpoint."],
        }

    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return {
            "score": 5,
            "risk_level": "medium",
            "issues": ["No se pudo interpretar correctamente la respuesta de la IA."],
            "recommendations": ["Revisar manualmente este endpoint."],
        }


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


def analyze_with_ollama(prompt: str) -> dict:
    system_prompt = """
    You are a senior backend API security auditor.

    Analyze the API endpoint and return ONLY valid JSON.

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

    Return exactly this JSON structure:

    {
      "score": number,
      "risk_level": "low" | "medium" | "high",
      "issues": ["string"],
      "recommendations": ["string"]
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
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        response.raise_for_status()
    except requests.RequestException:
        return {
            "score": 5,
            "risk_level": "medium",
            "issues": ["No se pudo conectar con Ollama."],
            "recommendations": ["Comprueba que Ollama está encendido y que el modelo está descargado."],
        }

    raw_text = response.json().get("response", "")
    analysis = extract_json_from_text(raw_text)

    score = float(analysis.get("score", 5))
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
    }
