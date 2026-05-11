export async function apiFetch(url, options = {}, token, onLogout) {
  // Helper único para mantener headers, manejo de sesión y errores
  // alineados entre login, historial y endpoints protegidos.
  const baseHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: baseHeaders,
  });

  if (response.status === 401) {
    // Si el backend invalida el token, forzamos logout en cliente
    // para evitar estado autenticado inconsistente.
    if (onLogout) {
      onLogout();
    }
    throw new Error("Sesión expirada");
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error(err);
    data = null;
  }

  if (!response.ok) {
    const backendMessage = data?.detail?.error?.message || (typeof data?.detail === "string" ? data.detail : null) || data?.message;
    const error = new Error(backendMessage || "Error en la petición");
    error.details = data;
    error.status = response.status;
    throw error;
  }

  return data;
}
