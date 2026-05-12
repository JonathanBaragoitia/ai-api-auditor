import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary captured an error", error, info);
  }

  reloadPage = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const showDetails = import.meta.env.DEV;

    return (
      <main style={shellStyle}>
        <section style={cardStyle} role="alert">
          <p style={eyebrowStyle}>Error de interfaz</p>
          <h1 style={titleStyle}>Algo salió mal al mostrar la aplicación</h1>
          <p style={textStyle}>
            La aplicación encontró un error inesperado al renderizar esta vista. Puedes recargar para volver a intentarlo.
          </p>
          <button type="button" onClick={this.reloadPage} style={buttonStyle}>Recargar</button>
          {showDetails && (
            <details style={detailsStyle}>
              <summary style={summaryStyle}>Detalle técnico</summary>
              <pre style={preStyle}>{this.state.error?.stack || this.state.error?.message}</pre>
            </details>
          )}
        </section>
      </main>
    );
  }
}

const shellStyle = {
  alignItems: "center",
  background: "linear-gradient(135deg, #020617 0%, #0f172a 48%, #111827 100%)",
  color: "white",
  display: "flex",
  minHeight: "100vh",
  padding: 24,
};

const cardStyle = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid #334155",
  borderRadius: 18,
  boxShadow: "0 24px 80px rgba(2, 6, 23, 0.5)",
  margin: "0 auto",
  maxWidth: 720,
  padding: 28,
};

const eyebrowStyle = {
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1.2,
  margin: "0 0 8px",
  textTransform: "uppercase",
};

const titleStyle = {
  fontSize: "clamp(28px, 4vw, 44px)",
  lineHeight: 1.05,
  margin: "0 0 12px",
};

const textStyle = {
  color: "#cbd5e1",
  lineHeight: 1.6,
  margin: "0 0 20px",
};

const buttonStyle = {
  background: "#2563eb",
  border: "1px solid #60a5fa",
  borderRadius: 12,
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
  padding: "11px 16px",
};

const detailsStyle = {
  marginTop: 18,
};

const summaryStyle = {
  color: "#bfdbfe",
  cursor: "pointer",
  fontWeight: 700,
};

const preStyle = {
  background: "#020617",
  border: "1px solid #1e293b",
  borderRadius: 12,
  color: "#e2e8f0",
  marginTop: 10,
  maxHeight: 260,
  overflow: "auto",
  padding: 12,
  whiteSpace: "pre-wrap",
};

export default ErrorBoundary;
