/**
 * Lista de URLs de archivos JSON alojados en AWS S3.
 * Puedes agregar o quitar URLs en este arreglo según lo necesites.
 */
export const S3_JSON_URLS: string[] = [
  "https://sportmind-datos.s3.us-east-1.amazonaws.com/JSON_SM/sportmind_data_20251126_162422_0f7973c3-fc53-405b-93b8-0f2e1766e0f3.json",
  "https://sportmind-datos.s3.us-east-1.amazonaws.com/JSON_SM/sportmind_data_20251126_163407_841e6432-d226-4d72-9dce-79c54aa4bdda.json",
  "https://sportmind-datos.s3.us-east-1.amazonaws.com/JSON_SM/sportmind_data_20251126_164357_e7c52dc1-7cf2-4ba0-89e1-301b8cd6b31b.json"
];

export interface SportmindSessionData {
  playerName?: string;
  selectedSport?: string;
  gender?: string;
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
  data: SportmindSessionData;
  raw?: unknown;
}

// Compatibilidad de tipos hacia atrás
export type SportmindRecord = SportmindSession;

/**
 * Normaliza cualquier estructura recibida al formato estándar SportmindSession
 */
export function normalizeSession(raw: unknown): SportmindSession {
  if (!raw || typeof raw !== "object") {
    return {
      timestamp: new Date().toISOString(),
      session_id: "unknown",
      data: {},
      raw,
    };
  }

  const obj = raw as Record<string, unknown>;

  // Si ya viene con la estructura { timestamp, session_id, data }
  if (obj.data && typeof obj.data === "object") {
    return {
      timestamp: String(obj.timestamp || new Date().toISOString()),
      session_id: String(obj.session_id || "sin-id"),
      data: obj.data as SportmindSessionData,
      raw,
    };
  }

  // Si los datos vienen en la raíz del objeto
  return {
    timestamp: String(obj.timestamp || new Date().toISOString()),
    session_id: String(obj.session_id || "sin-id"),
    data: obj as SportmindSessionData,
    raw,
  };
}

/**
 * Consulta un único archivo JSON en AWS S3 y normaliza los datos.
 */
export async function fetchSingleSportmindData(
  url: string,
): Promise<SportmindSession[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText} en ${url}`);
  }

  const json = await res.json();
  const items = Array.isArray(json) ? json : [json];
  return items.map(normalizeSession);
}

/**
 * Consulta y combina datos de una o múltiples URLs de AWS S3 en paralelo.
 */
export async function fetchSportmindData(
  sources: string | string[] = S3_JSON_URLS,
): Promise<SportmindSession[]> {
  const urls = Array.isArray(sources) ? sources : [sources];

  if (urls.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    urls.map((url) => fetchSingleSportmindData(url)),
  );

  const combinedRecords: SportmindSession[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      combinedRecords.push(...result.value);
    } else {
      console.warn(`Error al obtener datos de ${urls[index]}:`, result.reason);
      errors.push(urls[index]);
    }
  });

  if (combinedRecords.length === 0 && errors.length === urls.length) {
    throw new Error("No se pudo cargar ningún archivo JSON desde S3.");
  }

  // Ordenar por fecha descendente
  return combinedRecords.sort(
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

    // Filtro por deporte
    if (sport && sport !== "all") {
      if ((s.selectedSport || "").toLowerCase() !== sport.toLowerCase()) {
        return false;
      }
    }

    // Filtro por género
    if (gender && gender !== "all") {
      if ((s.gender || "").toLowerCase() !== gender.toLowerCase()) {
        return false;
      }
    }

    // Filtro por emoción
    if (emotion && emotion !== "all") {
      if ((s.emotionalState || "").toLowerCase() !== emotion.toLowerCase()) {
        return false;
      }
    }

    // Búsqueda general de texto
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

  // Ordenamiento
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

/**
 * Formatea fechas a formato legible en español
 */
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
