import {
  formatSignedNumber,
  getRiskLabel,
  normalizeDisplayScore,
  normalizeRisk,
} from "./display";
import { getRecommendationText } from "./recommendations";

const riskPriority = { low: 1, medium: 2, high: 3, critical: 4, unknown: 0 };

export function compareAudits(currentAudit, previousAudit) {
  const currentScore = normalizeDisplayScore(currentAudit?.average_score ?? currentAudit?.score);
  const previousScore = normalizeDisplayScore(previousAudit?.average_score ?? previousAudit?.score);
  const scoreDelta = typeof currentScore === "number" && typeof previousScore === "number"
    ? currentScore - previousScore
    : null;
  const currentRisk = normalizeRisk(currentAudit?.global_risk_level || currentAudit?.risk_level);
  const previousRisk = normalizeRisk(previousAudit?.global_risk_level || previousAudit?.risk_level);

  return {
    currentScore,
    previousScore,
    scoreDelta,
    formattedScoreDelta: scoreDelta === null ? "-" : formatSignedNumber(scoreDelta),
    currentRisk,
    previousRisk,
    riskChangeLabel: getRiskChangeLabel(currentRisk, previousRisk),
    issues: compareIssues(collectIssues(currentAudit), collectIssues(previousAudit)),
    recommendations: compareRecommendations(
      collectRecommendations(currentAudit),
      collectRecommendations(previousAudit),
    ),
    endpoints: compareEndpoints(
      Array.isArray(currentAudit?.endpoints) ? currentAudit.endpoints : [],
      Array.isArray(previousAudit?.endpoints) ? previousAudit.endpoints : [],
    ),
  };
}

export function compareIssues(currentIssues, previousIssues) {
  return compareItems(currentIssues, previousIssues, issueSignature, issueLabel);
}

export function compareEndpoints(currentEndpoints, previousEndpoints) {
  const previousByKey = new Map(previousEndpoints.map((endpoint) => [endpointKey(endpoint), endpoint]));
  const improved = [];
  const worsened = [];

  currentEndpoints.forEach((currentEndpoint) => {
    const previousEndpoint = previousByKey.get(endpointKey(currentEndpoint));
    if (!previousEndpoint) return;

    const currentScore = normalizeDisplayScore(currentEndpoint?.score);
    const previousScore = normalizeDisplayScore(previousEndpoint?.score);
    const scoreDelta = typeof currentScore === "number" && typeof previousScore === "number"
      ? currentScore - previousScore
      : 0;
    const currentRisk = normalizeRisk(currentEndpoint?.risk_level);
    const previousRisk = normalizeRisk(previousEndpoint?.risk_level);
    const riskDelta = (riskPriority[currentRisk] || 0) - (riskPriority[previousRisk] || 0);
    const endpointChange = {
      label: endpointLabel(currentEndpoint),
      currentScore,
      previousScore,
      scoreDelta,
      formattedScoreDelta: formatSignedNumber(scoreDelta),
      currentRisk,
      previousRisk,
      riskChangeLabel: getRiskChangeLabel(currentRisk, previousRisk),
    };

    if (scoreDelta > 0.1 || riskDelta < 0) {
      improved.push(endpointChange);
    } else if (scoreDelta < -0.1 || riskDelta > 0) {
      worsened.push(endpointChange);
    }
  });

  return { improved, worsened };
}

function compareRecommendations(currentRecommendations, previousRecommendations) {
  return compareItems(
    currentRecommendations,
    previousRecommendations,
    (recommendation) => normalizeText(getRecommendationText(recommendation)),
    (recommendation) => getRecommendationText(recommendation) || "Recomendación sin texto",
  );
}

function compareItems(currentItems, previousItems, getSignature, getLabel) {
  // Agrupamos por firma normalizada para comparar cambios reales entre auditorías,
  // no diferencias de formato ni duplicados generados por varios endpoints.
  const previousBySignature = groupItemsBySignature(previousItems, getSignature, getLabel);
  const currentBySignature = groupItemsBySignature(currentItems, getSignature, getLabel);

  return {
    currentCount: currentBySignature.size,
    previousCount: previousBySignature.size,
    newItems: [...currentBySignature.entries()]
      .filter(([signature]) => signature && !previousBySignature.has(signature))
      .map(([, item]) => formatGroupedLabel(item)),
    resolvedItems: [...previousBySignature.entries()]
      .filter(([signature]) => signature && !currentBySignature.has(signature))
      .map(([, item]) => formatGroupedLabel(item)),
  };
}

function groupItemsBySignature(items, getSignature, getLabel) {
  return items.reduce((acc, item) => {
    const signature = getSignature(item);
    if (!signature) return acc;

    const current = acc.get(signature);
    acc.set(signature, {
      label: current?.label || getLabel(item),
      occurrences: (current?.occurrences || 0) + getOccurrences(item),
    });

    return acc;
  }, new Map());
}

function formatGroupedLabel(item) {
  return item.occurrences > 1 ? `${item.label} (x${item.occurrences})` : item.label;
}

function getOccurrences(item) {
  return Number.isFinite(item?.occurrences) && item.occurrences > 0 ? item.occurrences : 1;
}

function getRiskChangeLabel(currentRisk, previousRisk) {
  const currentLabel = getRiskLabel(currentRisk);
  const previousLabel = getRiskLabel(previousRisk);
  const currentPriority = riskPriority[currentRisk] || 0;
  const previousPriority = riskPriority[previousRisk] || 0;

  if (currentPriority === previousPriority) {
    return `Riesgo estable: ${currentLabel}`;
  }

  const prefix = currentPriority < previousPriority ? "Mejora" : "Empeora";
  return `${prefix}: ${previousLabel} -> ${currentLabel}`;
}

function collectIssues(audit) {
  if (Array.isArray(audit?.issues) && audit.issues.length > 0) {
    return audit.issues;
  }

  return Array.isArray(audit?.endpoints)
    ? audit.endpoints.flatMap((endpoint) => (Array.isArray(endpoint?.issues) ? endpoint.issues : []))
    : [];
}

function collectRecommendations(audit) {
  if (Array.isArray(audit?.recommendations) && audit.recommendations.length > 0) {
    return audit.recommendations;
  }

  return Array.isArray(audit?.endpoints)
    ? audit.endpoints.flatMap((endpoint) => (
      Array.isArray(endpoint?.recommendations) ? endpoint.recommendations : []
    ))
    : [];
}

function issueSignature(issue) {
  if (typeof issue === "string") return normalizeText(issue);
  return normalizeText([
    issue?.title,
    issue?.category,
    issue?.severity,
    issue?.recommendation,
  ].filter(Boolean).join(" "));
}

function issueLabel(issue) {
  if (typeof issue === "string") return issue;
  return issue?.title || issue?.evidence || "Problema sin título";
}

function endpointKey(endpoint) {
  return `${String(endpoint?.method || "").toUpperCase()} ${endpoint?.path || ""}`.trim();
}

function endpointLabel(endpoint) {
  return endpointKey(endpoint) || "Endpoint sin ruta";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
