export function getRecommendationText(recommendation) {
  if (typeof recommendation === "string") {
    return recommendation;
  }

  if (recommendation && typeof recommendation === "object") {
    return recommendation.recommendation || recommendation.title || recommendation.description || "";
  }

  return "";
}

export function getAffectedEndpoints(recommendation) {
  if (!recommendation || typeof recommendation !== "object" || !Array.isArray(recommendation.affected_endpoints)) {
    return [];
  }

  return recommendation.affected_endpoints
    .map(formatEndpoint)
    .filter(Boolean);
}

export function getRecommendationOccurrences(recommendation) {
  if (!recommendation || typeof recommendation !== "object") {
    return null;
  }

  const occurrences = Number(recommendation.occurrences);
  return Number.isFinite(occurrences) && occurrences > 0 ? occurrences : null;
}

export function dedupeRecommendations(recommendations) {
  const seen = new Set();
  const unique = [];

  recommendations.forEach((recommendation) => {
    const text = getRecommendationText(recommendation).trim();
    const key = text.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(recommendation);
  });

  return unique;
}

function formatEndpoint(endpoint) {
  if (typeof endpoint === "string") return endpoint;
  if (endpoint && typeof endpoint === "object") {
    return [endpoint.method, endpoint.path].filter(Boolean).join(" ");
  }
  return "";
}
