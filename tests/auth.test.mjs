import assert from "node:assert/strict";
import test from "node:test";
import { authorizedFetch, clearSession, saveSession } from "../src/services/auth.ts";

test("renueva una sesión expirada y conserva el refresh token si Cognito no devuelve otro", async (t) => {
  const values = new Map();
  const originalStorage = globalThis.localStorage;
  const originalFetch = globalThis.fetch;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  t.after(() => { globalThis.localStorage = originalStorage; globalThis.fetch = originalFetch; });
  saveSession({ token: "expired", accessToken: "old-access", refreshToken: "refresh" });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === "/api/login") return Response.json({ success: true, token: "fresh", accessToken: "new-access" });
    return new Response(null, { status: calls.length === 1 ? 401 : 200 });
  };
  const response = await authorizedFetch("/api/metricas");
  assert.equal(response.status, 200);
  assert.equal(calls[0].options.headers.get("authorization"), "Bearer expired");
  assert.equal(JSON.parse(calls[1].options.body).refreshToken, "refresh");
  assert.equal(calls[2].options.headers.get("authorization"), "Bearer fresh");
  assert.equal(values.get("sportmind_refresh_token"), "refresh");
  clearSession();
  assert.equal(values.size, 0);
});
