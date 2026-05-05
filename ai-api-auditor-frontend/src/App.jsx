import { useEffect, useState } from "react";

const translate = (text) => {
  if (!text) return text;

  const map = {
    "/users": "Usuarios",
    "User API": "API de usuarios",
    "Users API": "API de usuarios",
    "Users API con IA": "API de usuarios con IA",

    "missing pagination": "Falta paginación",
    "missing validation on parameters": "Falta validación en parámetros",
    "No authentication or authorization": "Sin autenticación o autorización",
    "Lack of authentication": "Falta autenticación",
    "missing_email_validation": "Falta validación de email",

    "No authentication required for a sensitive endpoint like /users":
      "No se requiere autenticación en un endpoint sensible como Usuarios",

    "add pagination": "Añadir paginación",
    "improve security": "Mejorar seguridad",
    "consider using pagination": "Considerar usar paginación",

    "Implement JWT authentication and role-based access control":
      "Implementar autenticación JWT y control de roles",

    "Implement API key or JWT authentication to secure user data":
      "Implementar API Key o JWT para proteger los datos de usuarios",
  };

  return map[text] || text;
};

const getRiskLabel = (risk) => {
  if (risk === "low") return "Bajo";
  if (risk === "medium") return "Medio";
  if (risk === "high") return "Alto";
  return risk;
};

const getFriendlyEndpointName = (path) => {
  if (!path) return "Endpoint";

  const mapped = translate(path);
  if (mapped !== path) return mapped;

  const clean = path
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("{"))
    .pop();

  if (!clean) return "Endpoint";

  const normalized = clean.replace(/[-_]/g, " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const getColor = (risk) => {
    if (risk === "low") return "#22c55e";
    if (risk === "medium") return "#eab308";
    if (risk === "high") return "#ef4444";
    return "#94a3b8";
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/audits/");
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    try {
      const parsed = JSON.parse(input);

      const res = await fetch("http://127.0.0.1:8000/audits/openapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Frontend Audit",
          openapi_schema: parsed,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error();

      setResult(data);
      loadHistory();
    } catch (err) {
      console.error(err);
      alert("❌ JSON inválido o backend apagado");
    }

    setLoading(false);
  };

  return (
    <div style={page}>
      <div style={container}>
        <h1 style={title}>Auditor de APIs con IA</h1>

        <textarea
          placeholder="Pega tu OpenAPI JSON aquí..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={textarea}
        />

        <button onClick={handleAnalyze} style={button}>
          {loading ? "Analizando..." : "🚀 Analizar API"}
        </button>

        {/* RESULTADO */}
        {result && (
          <>
            <div style={stats}>
              <Card title="Endpoints" value={result.total_endpoints} />
              <Card title="Puntuación" value={result.average_score} />
              <Card
                title="Riesgo"
                value={getRiskLabel(result.global_risk_level)}
                color={getColor(result.global_risk_level)}
              />
            </div>

            <h2 style={section}>Endpoints analizados</h2>

            {result.endpoints.map((ep, i) => (
              <div key={i} style={card}>
                <div style={row}>
                  <h3>{getFriendlyEndpointName(ep.path)}</h3>
                  <span style={{ color: getColor(ep.risk_level) }}>
                    {getRiskLabel(ep.risk_level)}
                  </span>
                </div>

                <p><b>Resumen:</b> {translate(ep.summary)}</p>
                <p><b>Puntuación:</b> {ep.score}</p>

                {/* 🔥 PROBLEMAS */}
                <h4>Problemas</h4>
                {ep.issues.length > 0 ? (
                  <ul>
                    {ep.issues.map((x, j) => (
                      <li key={j}>{translate(x)}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ opacity: 0.6 }}>
                    Sin problemas detectados
                  </p>
                )}

                {/* 🔥 RECOMENDACIONES */}
                <h4>Recomendaciones</h4>
                {ep.recommendations.length > 0 ? (
                  <ul>
                    {ep.recommendations.map((x, j) => (
                      <li key={j}>{translate(x)}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ opacity: 0.6 }}>
                    Sin recomendaciones
                  </p>
                )}
              </div>
            ))}
          </>
        )}

        {/* HISTORIAL */}
        {history.length > 0 && (
          <>
            <h2 style={section}>Historial</h2>

            {history.map((a) => (
              <div key={a.id} style={card}>
                <div style={row}>
                  <h3>{translate(a.name)}</h3>
                  <span style={{ color: getColor(a.risk_level) }}>
                    {getRiskLabel(a.risk_level)}
                  </span>
                </div>

                <p><b>{getFriendlyEndpointName(a.path)}</b></p>
                <p>Puntuación: {a.score}</p>

                <h4>Problemas</h4>
                {a.issues.length > 0 ? (
                  <ul>
                    {a.issues.map((x, i) => (
                      <li key={i}>{translate(x)}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ opacity: 0.6 }}>
                    Sin problemas detectados
                  </p>
                )}

                <h4>Recomendaciones</h4>
                {a.recommendations.length > 0 ? (
                  <ul>
                    {a.recommendations.map((x, i) => (
                      <li key={i}>{translate(x)}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ opacity: 0.6 }}>
                    Sin recomendaciones
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const Card = ({ title, value, color }) => (
  <div style={miniCard}>
    <h3>{title}</h3>
    <p style={{ fontSize: 28, color }}>{value}</p>
  </div>
);

const page = {
  background: "#0f172a",
  minHeight: "100vh",
  color: "white",
  padding: 30,
};

const container = {
  maxWidth: 1000,
  margin: "0 auto",
};

const title = {
  textAlign: "center",
  fontSize: 40,
};

const textarea = {
  width: "100%",
  height: 200,
  marginTop: 20,
  padding: 15,
  background: "#1e293b",
  color: "white",
  borderRadius: 10,
};

const button = {
  marginTop: 20,
  padding: 12,
  width: "100%",
  background: "#6366f1",
  border: "none",
  color: "white",
  borderRadius: 10,
  cursor: "pointer",
};

const stats = {
  display: "flex",
  gap: 20,
  marginTop: 30,
};

const miniCard = {
  flex: 1,
  background: "#1e293b",
  padding: 20,
  borderRadius: 10,
  textAlign: "center",
};

const card = {
  background: "#1e293b",
  padding: 20,
  borderRadius: 10,
  marginTop: 20,
};

const section = {
  marginTop: 40,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
};

export default App;
