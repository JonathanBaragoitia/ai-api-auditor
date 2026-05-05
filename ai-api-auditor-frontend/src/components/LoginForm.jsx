import { useState } from "react";

function LoginForm({ onLogin, inputStyle, buttonStyle }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onLogin({ email, password });
    } catch (err) {
      console.error(err);
      setError("Credenciales inválidas o servidor no disponible");
    } finally {
      setLoading(false);
    }
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
        {loading ? "Entrando..." : "Iniciar sesión"}
      </button>

      {error && <p>{error}</p>}
    </form>
  );
}

export default LoginForm;
