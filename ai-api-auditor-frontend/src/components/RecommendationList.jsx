import {
  getAffectedEndpoints,
  getRecommendationOccurrences,
  getRecommendationText,
} from "../utils/recommendations";

function RecommendationList({ recommendations, translate }) {
  const safeRecommendations = Array.isArray(recommendations)
    ? recommendations.filter((recommendation) => getRecommendationText(recommendation))
    : [];

  if (safeRecommendations.length === 0) {
    return <p style={{ opacity: 0.6 }}>Sin recomendaciones</p>;
  }

  return (
    <div style={listStyle}>
      {safeRecommendations.map((recommendation, index) => {
        const text = getRecommendationText(recommendation);
        const occurrences = getRecommendationOccurrences(recommendation);
        const affectedEndpoints = getAffectedEndpoints(recommendation);

        return (
          <article key={`${text}-${index}`} style={itemStyle}>
            <p style={textStyle}>{translate(text)}</p>
            {occurrences && occurrences > 1 && (
              <p style={metaStyle}>Detectado {occurrences} veces</p>
            )}
            {affectedEndpoints.length > 0 && (
              <details style={detailsStyle}>
                <summary style={summaryStyle}>Ver endpoints afectados</summary>
                <div style={endpointGridStyle}>
                  {affectedEndpoints.map((endpoint, endpointIndex) => (
                    <span key={`${endpoint}-${endpointIndex}`} style={endpointPillStyle}>{endpoint}</span>
                  ))}
                </div>
              </details>
            )}
          </article>
        );
      })}
    </div>
  );
}

const listStyle = {
  display: "grid",
  gap: 10,
};

const itemStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  color: "#cbd5e1",
  padding: 12,
};

const textStyle = {
  margin: 0,
};

const metaStyle = {
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 700,
  margin: "8px 0 0",
};

const detailsStyle = {
  marginTop: 10,
};

const summaryStyle = {
  color: "#bfdbfe",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

const endpointGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 8,
};

const endpointPillStyle = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 999,
  color: "#cbd5e1",
  fontSize: 12,
  padding: "5px 8px",
};

export default RecommendationList;
