const LOGS_API_URL = "https://gx2dhrqhecasrejvbkcuxvogz40fjxfl.lambda-url.us-east-1.on.aws/";

/**
 * Registra una acción en AWS DynamoDB extrayendo automáticamente el usuario del token.
 * @param accion Descripción de lo que hizo el usuario (ej: "Ejecutó el análisis de IA para el registro #1042")
 * @param nivel Nivel del log ("INFO", "WARN", "ERROR")
 */
export async function registrarAccionAWS(accion: string, nivel: "INFO" | "WARN" | "ERROR" = "INFO") {
  let usuarioActual = "Sistema / Anónimo";
  
  try {
    const token = localStorage.getItem("sportmind_token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      usuarioActual = payload.email || payload.sub || usuarioActual;
    }
  } catch (e) {
    console.error("Error al decodificar el token para el log:", e);
  }

  try {
    await fetch(LOGS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: nivel,
        user: usuarioActual,
        action: accion
      })
    });
  } catch (e) {
    console.error("Error enviando log a AWS:", e);
  }
}