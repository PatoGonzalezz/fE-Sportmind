import assert from "node:assert/strict";
import test from "node:test";
import { proxySportmind } from "../src/server/sportmind-api.mjs";

test("el proxy usa la API configurada y transmite el token solo a rutas protegidas", async (t) => {
  const previousUrl = process.env.SPORTMIND_API_URL;
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.SPORTMIND_API_URL;
    else process.env.SPORTMIND_API_URL = previousUrl;
  });
  process.env.SPORTMIND_API_URL = "https://api.example.com/dev/";
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ error: "denied" }), { status: 403, headers: { "Content-Type": "application/json" } });
  };

  const missing = await proxySportmind(new Request("http://localhost/api/metricas"), "metricas");
  assert.equal(missing.status, 401);
  assert.equal(calls.length, 0);

  const request = new Request("http://localhost/api/metricas", {
    method: "POST", headers: { Authorization: "Bearer id-token", "Content-Type": "application/json", Cookie: "private=yes" },
    body: JSON.stringify({ action: "assign_specialist", session_id: "123456" }),
  });
  const result = await proxySportmind(request, "metricas");
  assert.equal(result.status, 403);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(calls[0].url, "https://api.example.com/dev/metricas");
  assert.equal(calls[0].options.headers.get("authorization"), "Bearer id-token");
  assert.equal(calls[0].options.headers.has("cookie"), false);
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(JSON.parse(calls[0].options.body).session_id, "123456");

  await proxySportmind(new Request("http://localhost/api/login", {
    method: "POST", headers: { Authorization: "Bearer ignored" }, body: "{}",
  }), "login", { authenticated: false });
  assert.equal(calls[1].options.headers.has("authorization"), false);

  process.env.SPORTMIND_API_URL = "http://example.com";
  assert.equal((await proxySportmind(new Request("http://localhost/api/login"), "login", { authenticated: false })).status, 503);
  assert.equal(calls.length, 2);
});
