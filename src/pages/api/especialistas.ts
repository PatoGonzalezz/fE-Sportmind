export const prerender = false;
import type { APIRoute } from "astro";
import { proxySportmind } from "../../server/sportmind-api.mjs";

export const GET: APIRoute = ({ request }) => proxySportmind(request, "usuarios");

// La infraestructura actual no tiene una operación de edición de usuarios.
export const POST: APIRoute = () => new Response(JSON.stringify({
  success: false,
  error: "La edición de usuarios aún no está disponible en la API.",
}), { status: 501, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
