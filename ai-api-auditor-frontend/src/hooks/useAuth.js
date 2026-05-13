import { useCallback, useState } from "react";

import { apiFetch } from "../utils/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function useAuth() {
  const [token, setToken] = useState(sessionStorage.getItem("token"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveToken = (accessToken) => {
    setToken(accessToken);
    // Evitamos persistencia indefinida del JWT en el navegador; para producción,
    // el siguiente paso natural sería migrar a cookies HttpOnly + SameSite.
    sessionStorage.setItem("token", accessToken);
  };

  const login = async ({ email, password }) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data?.access_token) {
        throw new Error("Login failed");
      }

      saveToken(data.access_token);
    } catch (err) {
      console.error(err);
      setError("No se pudo iniciar sesión");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ email, password }) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data?.access_token) {
        throw new Error("Register failed");
      }

      saveToken(data.access_token);
    } catch (err) {
      console.error(err);
      setError("No se pudo crear la cuenta");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setError(null);
    sessionStorage.removeItem("token");
  }, []);

  return {
    token,
    authLoading: loading,
    authError: error,
    login,
    register,
    logout,
  };
}
