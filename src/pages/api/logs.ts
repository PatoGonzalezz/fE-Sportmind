export const prerender = false;
import type { APIRoute } from "astro";
import { proxySportmind } from "../../server/sportmind-api.mjs";

export const GET: APIRoute = ({ request }) => proxySportmind(request, "logs");
export const POST: APIRoute = ({ request }) => proxySportmind(request, "logs");
export const DELETE: APIRoute = ({ request }) => proxySportmind(request, "logs");
