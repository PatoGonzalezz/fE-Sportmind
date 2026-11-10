import { authorizedFetch } from "./auth";

export const LOGS_API_URL = "/api/logs";

/**
 * Registra una acción en AWS DynamoDB extrayendo automáticamente el usuario del token.
 * Además guarda una copia en localStorage para respaldo y soporte sin conexión.
 * @param accion Descripción de lo que hizo el usuario (ej: "Ejecutó el análisis de IA para el registro #1042")
 * @param nivel Nivel del log ("INFO" | "WARN" | "ERROR")
 */
export async function registrarAccionAWS(accion: string, nivel: "INFO" | "WARN" | "ERROR" = "INFO") {
  let usuarioActual = "Sistema / Anónimo";
  
  try {
    const token = localStorage.getItem("sportmind_token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      usuarioActual =
        payload.email ||
        payload.name ||
        payload.given_name ||
        payload["cognito:username"] ||
        localStorage.getItem("sportmind_user") ||
        payload.sub ||
        usuarioActual;
    } else {
      usuarioActual = localStorage.getItem("sportmind_user") || usuarioActual;
    }
  } catch (e) {
    console.error("Error al decodificar el token para el log:", e);
  }

  // Respaldo local inmediato en localStorage para soporte offline y panel de inicio
  try {
    const fechaHora = new Date().toLocaleString("es-CL");
    const historialLogs = JSON.parse(localStorage.getItem("sportmind_logs") || "[]");
    historialLogs.push(`[${fechaHora}] [${nivel}] [${usuarioActual}]: ${accion}`);
    localStorage.setItem("sportmind_logs", JSON.stringify(historialLogs));
  } catch (e) {
    console.error("Error al guardar log localmente:", e);
  }

  try {
    const response = await authorizedFetch(LOGS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: nivel,
        user: usuarioActual,
        action: accion
      })
    });
    if (!response.ok) console.error(`No se pudo guardar el log (HTTP ${response.status}).`);
  } catch (e) {
    console.error("Error enviando log a AWS:", e);
  }
}
