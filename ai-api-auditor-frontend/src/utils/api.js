export async function apiFetch(url, options = {}, token, onLogout) {
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
    if (onLogout) {
      onLogout();
    }
    throw new Error("Sesión expirada");
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_err) {
    data = null;
  }

  if (!response.ok) {
    const backendMessage = data?.detail || data?.message;
    throw new Error(backendMessage || "Error en la petición");
  }

  return data;
}
