export const prerender = false;
import type { APIRoute } from "astro";
import { proxySportmind } from "../../server/sportmind-api.mjs";

export const POST: APIRoute = ({ request }) => proxySportmind(request, "sportMind-crear-entrenador-cognito");
