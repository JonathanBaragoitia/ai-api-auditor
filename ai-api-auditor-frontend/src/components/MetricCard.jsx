function MetricCard({ title, value, color, style, compact = false }) {
  return (
    <div style={style}>
      <h3 style={titleStyle}>{title}</h3>
      <p style={{ ...valueStyle, fontSize: compact ? 18 : 28, color }}>{value}</p>
    </div>
  );
}

const titleStyle = {
  color: "#94a3b8",
  fontSize: 14,
  margin: "0 0 10px",
};

const valueStyle = {
  fontWeight: 800,
  margin: 0,
  overflowWrap: "anywhere",
};

export default MetricCard;
