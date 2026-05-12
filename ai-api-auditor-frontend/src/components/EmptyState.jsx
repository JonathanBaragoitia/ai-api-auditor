function EmptyState({ title, description, action, compact = false }) {
  return (
    <div style={compact ? compactStyle : containerStyle}>
      <div style={iconStyle}>⌁</div>
      <div>
        <h3 style={titleStyle}>{title}</h3>
        <p style={descriptionStyle}>{description}</p>
        {action && <p style={actionStyle}>{action}</p>}
      </div>
    </div>
  );
}

const containerStyle = {
  alignItems: "flex-start",
  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.88))",
  border: "1px solid #334155",
  borderRadius: 16,
  color: "#e2e8f0",
  display: "flex",
  gap: 14,
  marginTop: 14,
  padding: 18,
};

const compactStyle = {
  ...containerStyle,
  marginTop: 0,
  padding: 14,
};

const iconStyle = {
  alignItems: "center",
  background: "#0f172a",
  border: "1px solid #475569",
  borderRadius: 12,
  color: "#93c5fd",
  display: "inline-flex",
  flex: "0 0 auto",
  fontSize: 24,
  height: 42,
  justifyContent: "center",
  width: 42,
};

const titleStyle = {
  fontSize: 18,
  margin: 0,
};

const descriptionStyle = {
  color: "#cbd5e1",
  lineHeight: 1.5,
  margin: "6px 0 0",
};

const actionStyle = {
  color: "#93c5fd",
  fontWeight: 700,
  margin: "8px 0 0",
};

export default EmptyState;
