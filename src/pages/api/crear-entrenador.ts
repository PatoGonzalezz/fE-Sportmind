export const prerender = false;

import type { APIRoute } from "astro";
import { registrarEspecialistaCognito } from "../../services/userServices";

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const resultado = await registrarEspecialistaCognito(body);

        return new Response(JSON.stringify(resultado), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
};