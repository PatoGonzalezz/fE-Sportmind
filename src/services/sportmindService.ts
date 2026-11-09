import { authorizedFetch } from "./auth";

export interface SportmindSessionData {
  playerName?: string;
  selectedSport?: string;
  gender?: string;
  playerAge?: number;
  sessionDurationSeconds?: number;
  emotionalState?: string;
  preEmotionTiroEasy?: string | number;
  preEmotionTiroHard?: string | number;
  preEmotionMuroEasy?: string | number;
  preEmotionMuroHard?: string | number;
  shootingScoreEasy?: number;
  shootingScoreHard?: number;
  shootingPostEmotion?: string;
  shootingRendimiento?: number;
  shootingRitmo?: number;
  shootingConfianza?: number;
  climbingTimeEasy?: number;
  climbingTimeHard?: number;
  climbingPostEmotion?: string;
  climbingRendimiento?: number;
  climbingRitmo?: number;
  climbingConfianza?: number;
  recomendacionFinal?: number;
  [key: string]: unknown;
}

export interface SportmindSession {
  timestamp: string;
  session_id: string;
  assigned_specialist?: string | null;
  data: SportmindSessionData;
  raw?: unknown;
}

export type SportmindRecord = SportmindSession;

/**
 * Normaliza cualquier estructura recibida al formato estándar SportmindSession
 */
export function normalizeSession(raw: unknown): SportmindSession {
  if (!raw || typeof raw !== "object") {
    return {
      timestamp: new Date().toISOString(),
      session_id: "unknown",
      assigned_specialist: null,
      data: {},
      raw,
    };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.data && typeof obj.data === "object") {
    return {
      timestamp: String(obj.timestamp || new Date().toISOString()),
      session_id: String(obj.session_id || "sin-id"),
      assigned_specialist: (obj.assigned_specialist as string) || null,
      data: obj.data as SportmindSessionData,
      raw,
    };
  }

  return {
    timestamp: String(obj.timestamp || new Date().toISOString()),
    session_id: String(obj.session_id || "sin-id"),
    assigned_specialist: (obj.assigned_specialist as string) || null,
    data: obj as SportmindSessionData,
    raw,
  };
}

/** Consulta las sesiones autorizadas mediante API Gateway; el bucket permanece privado. */
export async function fetchSportmindData(): Promise<SportmindSession[]> {
  const response = await authorizedFetch("/api/metricas");
  if (!response.ok) throw new Error(`No se pudieron cargar las sesiones (HTTP ${response.status}).`);
  const records = await response.json();
  if (!Array.isArray(records)) throw new Error("La API devolvió una lista de sesiones inválida.");
  let sessions: SportmindSession[] = records.flatMap((record: unknown) => Array.isArray(record) ? record : [record])
    .map(normalizeSession);
  // Defensa adicional durante la transición: la autorización efectiva pertenece a la API.
  try {
    const token = localStorage.getItem("sportmind_token") || "";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const groups = Array.isArray(payload["cognito:groups"]) ? payload["cognito:groups"] : [];
    if (!groups.includes("administrador")) {
      const email = String(payload.email || "").toLowerCase();
      sessions = email ? sessions.filter((session) => session.assigned_specialist?.toLowerCase() === email) : [];
    }
  } catch {
    sessions = [];
  }
  return sessions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export interface FilterOptions {
  query?: string;
  sport?: string;
  gender?: string;
  emotion?: string;
  sortBy?: "date-desc" | "date-asc" | "name-asc" | "shooting-desc" | "climbing-asc";
}

/**
 * Filtra y ordena las sesiones de Sportmind.
 */
export function filterSportmindRecords(
  records: SportmindSession[],
  options: FilterOptions | string = {},
): SportmindSession[] {
  const opts: FilterOptions =
    typeof options === "string" ? { query: options } : options;

  const {
    query = "",
    sport = "all",
    gender = "all",
    emotion = "all",
    sortBy = "date-desc",
  } = opts;

  const cleanQuery = query.toLowerCase().trim();

  let filtered = records.filter((session) => {
    const s = session.data;

    if (sport && sport !== "all") {
      if ((s.selectedSport || "").toLowerCase() !== sport.toLowerCase()) {
        return false;
      }
    }

    if (gender && gender !== "all") {
      if ((s.gender || "").toLowerCase() !== gender.toLowerCase()) {
        return false;
      }
    }

    if (emotion && emotion !== "all") {
      if ((s.emotionalState || "").toLowerCase() !== emotion.toLowerCase()) {
        return false;
      }
    }

    if (cleanQuery) {
      const matchName = (s.playerName || "").toLowerCase().includes(cleanQuery);
      const matchSport = (s.selectedSport || "").toLowerCase().includes(cleanQuery);
      const matchEmotion = (s.emotionalState || "").toLowerCase().includes(cleanQuery);
      const matchId = session.session_id.toLowerCase().includes(cleanQuery);
      const serialized = JSON.stringify(session).toLowerCase();

      if (!matchName && !matchSport && !matchEmotion && !matchId && !serialized.includes(cleanQuery)) {
        return false;
      }
    }

    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "date-asc":
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case "name-asc":
        return (a.data.playerName || "").localeCompare(b.data.playerName || "");
      case "shooting-desc": {
        const scoreA = (a.data.shootingScoreEasy ?? 0) + (a.data.shootingScoreHard ?? 0);
        const scoreB = (b.data.shootingScoreEasy ?? 0) + (b.data.shootingScoreHard ?? 0);
        return scoreB - scoreA;
      }
      case "climbing-asc": {
        const timeA = (a.data.climbingTimeEasy ?? 999) + (a.data.climbingTimeHard ?? 999);
        const timeB = (b.data.climbingTimeEasy ?? 999) + (b.data.climbingTimeHard ?? 999);
        return timeA - timeB;
      }
      case "date-desc":
      default:
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });

  return filtered;
}

/**
 * Mapeo de estilos y etiquetas para estados emocionales
 */
export function getEmotionConfig(emotion?: string): {
  label: string;
  badgeClass: string;
  borderClass: string;
  dotClass: string;
  icon: string;
  bgGlow: string;
} {
  const norm = (emotion || "").toLowerCase().trim();
  switch (norm) {
    case "feliz":
    case "alegre":
    case "motivado":
      return {
        label: emotion || "Feliz",
        badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        borderClass: "border-emerald-500/40",
        dotClass: "bg-emerald-400 shadow-emerald-500/50",
        icon: "😊",
        bgGlow: "from-emerald-500/10 to-transparent",
      };
    case "calma":
    case "tranquilo":
    case "concentrado":
      return {
        label: emotion || "Calma",
        badgeClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        borderClass: "border-cyan-500/40",
        dotClass: "bg-cyan-400 shadow-cyan-500/50",
        icon: "😌",
        bgGlow: "from-cyan-500/10 to-transparent",
      };
    case "ansioso":
    case "nervioso":
    case "estresado":
      return {
        label: emotion || "Ansioso",
        badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        borderClass: "border-amber-500/40",
        dotClass: "bg-amber-400 shadow-amber-500/50",
        icon: "⚡",
        bgGlow: "from-amber-500/10 to-transparent",
      };
    case "triste":
    case "desanimado":
    case "frustrado":
      return {
        label: emotion || "Triste",
        badgeClass: "bg-purple-500/10 text-purple-300 border-purple-500/30",
        borderClass: "border-purple-500/40",
        dotClass: "bg-purple-400 shadow-purple-500/50",
        icon: "🌧️",
        bgGlow: "from-purple-500/10 to-transparent",
      };
    case "enojado":
    case "molesto":
      return {
        label: emotion || "Enojado",
        badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
        borderClass: "border-rose-500/40",
        dotClass: "bg-rose-400 shadow-rose-500/50",
        icon: "🔥",
        bgGlow: "from-rose-500/10 to-transparent",
      };
    default:
      return {
        label: emotion || "Neutro",
        badgeClass: "bg-slate-700/50 text-slate-300 border-slate-600/50",
        borderClass: "border-slate-700",
        dotClass: "bg-slate-400 shadow-slate-500/50",
        icon: "👤",
        bgGlow: "from-indigo-500/10 to-transparent",
      };
  }
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return "Fecha no disponible";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
