import MetricCard from "./MetricCard";
import { formatScoreValue } from "../utils/display";

function SummaryCards({ result, getRiskLabel, getColor, statsStyle, miniCardStyle }) {
  const totalEndpoints = typeof result?.total_endpoints === "number" ? result.total_endpoints : "-";
  const averageScore = formatScoreValue(result?.average_score);
  const globalRiskLevel = result?.global_risk_level ?? "-";

  return (
    <div style={statsStyle}>
      <MetricCard title="Endpoints" value={totalEndpoints} style={miniCardStyle} />
      <MetricCard title="Puntuación" value={averageScore === "-" ? "-" : `${averageScore}/100`} style={miniCardStyle} />
      <MetricCard
        title="Riesgo"
        value={globalRiskLevel === "-" ? "-" : getRiskLabel(globalRiskLevel)}
        color={globalRiskLevel === "-" ? undefined : getColor(globalRiskLevel)}
        style={miniCardStyle}
      />
    </div>
  );
}

export default SummaryCards;
