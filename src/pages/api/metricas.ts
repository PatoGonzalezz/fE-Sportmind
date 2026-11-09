export const prerender = false;
import type { APIRoute } from "astro";
import { proxySportmind } from "../../server/sportmind-api.mjs";

export const GET: APIRoute = ({ request }) => proxySportmind(request, "metricas");
export const POST: APIRoute = ({ request }) => proxySportmind(request, "metricas");
