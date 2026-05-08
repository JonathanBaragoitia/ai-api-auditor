function AIObservationCards({ item, translate, compact = false }) {
  const observations = [
    ["Resumen IA", item?.summary],
    ["Observación técnica", item?.technical_observation],
    ["Observación de seguridad", item?.security_observation],
    ["Observación de mantenibilidad", item?.maintainability_observation],
  ].filter(([, value]) => typeof value === "string" && value.trim());

  if (observations.length === 0) {
    return null;
  }

  return (
    <div style={compact ? compactGridStyle : gridStyle}>
      {observations.map(([title, value]) => (
        <section key={title} style={cardStyle}>
          <h4 style={titleStyle}>{title}</h4>
          <p style={textStyle}>{translate(value)}</p>
        </section>
      ))}
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  margin: "14px 0",
};

const compactGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  margin: "12px 0",
};

const cardStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 14,
};

const titleStyle = {
  margin: "0 0 8px",
  color: "#e2e8f0",
};

const textStyle = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.5,
};

export default AIObservationCards;
