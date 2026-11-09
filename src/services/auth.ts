type AuthResult = { token: string; accessToken: string; refreshToken?: string };
let refreshing: Promise<boolean> | null = null;

export function saveSession(result: AuthResult) {
  localStorage.setItem("sportmind_token", result.token);
  localStorage.setItem("sportmind_access_token", result.accessToken);
  if (result.refreshToken) localStorage.setItem("sportmind_refresh_token", result.refreshToken);
}

export function clearSession() {
  localStorage.removeItem("sportmind_token");
  localStorage.removeItem("sportmind_access_token");
  localStorage.removeItem("sportmind_refresh_token");
}

async function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  const refreshToken = localStorage.getItem("sportmind_refresh_token");
  if (!refreshToken) return false;
  refreshing = (async () => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", refreshToken }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.token || !result.accessToken ||
          localStorage.getItem("sportmind_refresh_token") !== refreshToken) return false;
      saveSession(result);
      return true;
    } catch {
      return false;
    }
  })();
  try { return await refreshing; } finally { refreshing = null; }
}

export async function authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers);
    const token = localStorage.getItem("sportmind_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };
  const response = await send();
  if (response.status !== 401 || !(await refreshSession())) return response;
  return send();
}

export async function getAccessToken(): Promise<string | null> {
  let token = localStorage.getItem("sportmind_access_token");
  try {
    const payload = JSON.parse(atob((token || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp * 1000 > Date.now() + 30_000) return token;
  } catch { /* Renovar si el token falta o es inválido. */ }
  if (await refreshSession()) token = localStorage.getItem("sportmind_access_token");
  else token = null;
  return token;
}
