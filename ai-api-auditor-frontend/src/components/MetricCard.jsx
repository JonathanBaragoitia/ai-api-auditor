function MetricCard({ title, value, color, style }) {
  return (
    <div style={style}>
      <h3>{title}</h3>
      <p style={{ fontSize: 28, color }}>{value}</p>
    </div>
  );
}

export default MetricCard;
