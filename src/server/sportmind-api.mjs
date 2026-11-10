// Las rutas locales solo pueden comunicarse con la API configurada por el operador.
export async function proxySportmind(request, route, { authenticated = true } = {}) {
  const configuredUrl = process.env.SPORTMIND_API_URL || import.meta.env?.SPORTMIND_API_URL;
  if (!configuredUrl) {
    return errorResponse(503, "SPORTMIND_API_URL no está configurada en el servidor.");
  }

  let base;
  try {
    base = new URL(configuredUrl);
    const localHttp = base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if ((base.protocol !== "https:" && !localHttp) || base.username || base.password || base.search || base.hash) {
      throw new Error("URL inválida");
    }
  } catch {
    return errorResponse(503, "SPORTMIND_API_URL debe ser una URL HTTPS válida de la API.");
  }

  const authorization = request.headers.get("authorization");
  if (authenticated && !/^Bearer\s+\S+$/i.test(authorization || "")) {
    return errorResponse(401, "Se requiere una sesión de Cognito.");
  }

  const headers = new Headers();
  if (authenticated) headers.set("Authorization", authorization);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const url = `${base.toString().replace(/\/+$/, "")}/${route}`;

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      redirect: "error",
      signal: request.signal,
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const responseType = upstream.headers.get("content-type");
    if (responseType) responseHeaders.set("Content-Type", responseType);
    return new Response([204, 205, 304].includes(upstream.status) ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return errorResponse(502, "No se pudo conectar con la API de SportMind.");
  }
}

function errorResponse(status, error) {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
