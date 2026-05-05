import { useState } from "react";

function LoginForm({ onLogin, onRegister, inputStyle, buttonStyle }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegisterMode) {
        await onRegister({ email, password });
      } else {
        await onLogin({ email, password });
      }
    } catch (err) {
      console.error(err);
      setError(
        isRegisterMode
          ? "No se pudo crear la cuenta"
          : "Credenciales inválidas o servidor no disponible",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode((prev) => !prev);
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
      />

      <button type="submit" style={buttonStyle}>
        {loading ? "Procesando..." : isRegisterMode ? "Crear cuenta" : "Iniciar sesión"}
      </button>

      <button type="button" style={buttonStyle} onClick={toggleMode}>
        {isRegisterMode ? "Volver a login" : "Crear cuenta"}
      </button>

      {error && <p>{error}</p>}
    </form>
  );
}

export default LoginForm;
