export function normalizeDisplayScore(score) {
  const numericScore = Number(score);

  if (Number.isNaN(numericScore)) {
    return "-";
  }

  const normalized = numericScore <= 10 ? numericScore * 10 : numericScore;
  return Math.round(normalized * 10) / 10;
}

export function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeRisk(value) {
  const risk = normalizeToken(value);

  if (["bajo", "baja", "low"].includes(risk)) return "low";
  if (["medio", "media", "medium"].includes(risk)) return "medium";
  if (["alto", "alta", "high"].includes(risk)) return "high";
  if (["critico", "crítico", "critica", "crítica", "critical"].includes(risk)) return "critical";

  return risk || "unknown";
}

export function normalizeSeverity(value) {
  return normalizeRisk(value);
}

export function normalizeCategory(value) {
  const category = normalizeToken(value);

  return {
    seguridad: "security",
    security: "security",
    validacion: "validation",
    validación: "validation",
    validation: "validation",
    documentacion: "documentation",
    documentación: "documentation",
    documentation: "documentation",
    rendimiento: "performance",
    performance: "performance",
    "diseño rest": "rest_design",
    rest_design: "rest_design",
    mantenibilidad: "maintainability",
    maintainability: "maintainability",
    observabilidad: "observability",
    observability: "observability",
  }[category] || category || "general";
}

export function normalizeStatus(value) {
  const status = normalizeToken(value);

  return {
    pendiente: "pending",
    pending: "pending",
    procesando: "processing",
    procesamiento: "processing",
    processing: "processing",
    "en ejecución": "processing",
    ejecucion: "processing",
    ejecución: "processing",
    running: "processing",
    completada: "completed",
    completado: "completed",
    completed: "completed",
    fallida: "failed",
    fallido: "failed",
    failed: "failed",
  }[status] || status || "completed";
}

export function getRiskLabel(risk) {
  return {
    low: "Bajo",
    medium: "Medio",
    high: "Alto",
    critical: "Crítico",
  }[normalizeRisk(risk)] || risk || "-";
}

export function getSeverityLabel(severity) {
  return {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
  }[normalizeSeverity(severity)] || "Media";
}

export function getCategoryLabel(category) {
  return {
    security: "Seguridad",
    validation: "Validación",
    documentation: "Documentación",
    performance: "Rendimiento",
    rest_design: "Diseño REST",
    maintainability: "Mantenibilidad",
    observability: "Observabilidad",
  }[normalizeCategory(category)] || "General";
}

export function getStatusLabel(status) {
  return {
    pending: "Pendiente",
    processing: "Procesando",
    completed: "Completada",
    failed: "Fallida",
  }[normalizeStatus(status)] || "Completada";
}

export function getAuditModeLabel(mode) {
  return {
    security: "Seguridad",
    rest_design: "Diseño REST",
    documentation: "Documentación",
    enterprise: "Enterprise",
  }[mode || "enterprise"] || "Enterprise";
}
