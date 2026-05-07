import { useCallback, useState } from "react";
import AuditForm from "./components/AuditForm";
import DashboardStats from "./components/DashboardStats";
import HistoryList from "./components/HistoryList";
import LoginForm from "./components/LoginForm";
import ResultsPanel from "./components/ResultsPanel";
import SummaryCards from "./components/SummaryCards";
import { useAudits } from "./hooks/useAudits";
import { useAuth } from "./hooks/useAuth";

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
  const { token, login, register, logout } = useAuth();

  const getColor = (risk) => {
    if (risk === "low") return "#22c55e";
    if (risk === "medium") return "#eab308";
    if (risk === "high") return "#ef4444";
    return "#94a3b8";
  };

  const {
    result,
    history,
    auditLoading,
    auditError,
    auditSuccess,
    analyzeOpenAPI,
    exportResult,
    exportPdfReport,
    clearAuditState,
  } = useAudits(token, logout);

  const handleLogout = useCallback(() => {
    logout();
    clearAuditState();
  }, [logout, clearAuditState]);

  return (
    <div style={page}>
      <div style={container}>
        <h1 style={title}>Auditor de APIs con IA</h1>

        {!token ? (
          <LoginForm
            onLogin={login}
            onRegister={register}
            inputStyle={inputField}
            buttonStyle={button}
          />
        ) : (
          <>
            <button onClick={handleLogout} style={button}>
              Cerrar sesión
            </button>

            <AuditForm
              input={input}
              onInputChange={setInput}
              onAnalyze={() => analyzeOpenAPI(input)}
              loading={auditLoading}
              error={auditError}
              success={auditSuccess}
              textareaStyle={textarea}
              buttonStyle={button}
            />

            {/* RESULTADO */}
            {result && (
              <>
                <button onClick={exportResult} style={button}>
                  Exportar resultado JSON
                </button>

                <button onClick={exportPdfReport} style={button}>
                  Exportar informe PDF
                </button>

                <SummaryCards
                  result={result}
                  getRiskLabel={getRiskLabel}
                  getColor={getColor}
                  statsStyle={stats}
                  miniCardStyle={miniCard}
                />
                <ResultsPanel
                  result={result}
                  sectionStyle={section}
                  cardStyle={card}
                  rowStyle={row}
                  getFriendlyEndpointName={getFriendlyEndpointName}
                  getColor={getColor}
                  getRiskLabel={getRiskLabel}
                  translate={translate}
                />
              </>
            )}

            {history.length > 0 && (
              <DashboardStats
                history={history}
                getRiskLabel={getRiskLabel}
                getColor={getColor}
                statsStyle={stats}
                miniCardStyle={miniCard}
                sectionStyle={section}
              />
            )}

            <HistoryList
              history={history}
              sectionStyle={section}
              cardStyle={card}
              rowStyle={row}
              translate={translate}
              getColor={getColor}
              getRiskLabel={getRiskLabel}
              getFriendlyEndpointName={getFriendlyEndpointName}
            />
          </>
        )}
      </div>
    </div>
  );
}

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

const inputField = {
  width: "100%",
  marginTop: 20,
  padding: 12,
  background: "#1e293b",
  color: "white",
  borderRadius: 10,
  border: "1px solid #334155",
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
