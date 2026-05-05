def calculate_risk_level(score: float) -> str:
    if score >= 8:
        return "low"

    if score >= 5:
        return "medium"

    return "high"