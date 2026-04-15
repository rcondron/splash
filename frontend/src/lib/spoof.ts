/**
 * Local-only demo session: no network calls to Quint/Matrix when active.
 * Login with username `spoof` and password `spoof` on the login page.
 */

export const SPOOF_AUTH_TOKEN = "__SPLASH_SPOOF_SESSION__";

export function isSpoofAuthToken(token: string | null | undefined): boolean {
  return token === SPOOF_AUTH_TOKEN;
}

/** Hard-coded demo credentials (login form) */
export const SPOOF_LOGIN_USERNAME = "spoof";
export const SPOOF_LOGIN_PASSWORD = "spoof";

interface RequestOpts {
  method?: string;
  body?: unknown;
}

export function shouldBlockNetwork(): boolean {
  if (typeof window === "undefined") return false;
  return isSpoofAuthToken(
    localStorage.getItem("auth-token") || undefined,
  );
}

/**
 * Returns in-memory JSON for Quint/Matrix/V2 routes — never hits the server.
 */
export function getSpoofMockResponse<T>(
  endpoint: string,
  options: RequestOpts = {},
): T {
  const method = (options.method || "GET").toUpperCase();

  /* ── Quint API (/quint-api/...) ── */
  if (endpoint.startsWith("/quint-api")) {
    const path = endpoint.replace(/^\/quint-api/, "");

    if (path.startsWith("/v1/health")) {
      return {
        status: "healthy",
        database: { connected: true, status: "healthy" },
        timestamp: new Date().toISOString(),
      } as T;
    }
    if (path.startsWith("/v1/stats")) {
      return {
        system: { cpu_percent: 0, memory_percent: 0 },
        connection_pool: {},
        token_cache: { available: true },
        timestamp: new Date().toISOString(),
      } as T;
    }
    if (path.startsWith("/v1/metrics")) {
      return {
        metrics: {
          uptime_hours: 0,
          requests_total: 0,
          cpu_usage: { usage_percent: 0 },
          memory_usage: { usage_percent: 0 },
          disk_usage: { usage_percent: 0 },
        },
      } as T;
    }
    if (path.startsWith("/v1/users/me/unread")) {
      return { success: true, total: 0, rooms: {} } as T;
    }
    if (method === "GET" && path.startsWith("/v1/rooms")) {
      return {
        success: true,
        rooms: [
          {
            room_id: "!spoof-demo:splash.local",
            name: "Demo room (offline)",
            member_count: 1,
            is_direct: false,
          },
        ],
      } as T;
    }
    if (path.startsWith("/v1/messages/get")) {
      return { success: true, messages: [], chunk: [] } as T;
    }
    if (path.startsWith("/v1/ai/v181/status")) {
      return {
        success: true,
        phase: 0,
        capability: "spoof",
        available_capabilities: [
          "translation",
          "maritime_glossary",
          "entity_recognition",
          "voyage_structured_extraction",
        ],
      } as T;
    }
    if (path.startsWith("/v1/ai/v181/glossary")) {
      return {
        success: true,
        count: 1,
        items: [
          {
            term: "SPOOF",
            term_display: "SPOOF",
            category: "demo",
            definition: "Local demo mode — not connected to the API.",
          },
        ],
      } as T;
    }
    if (path.includes("/v1/ai/v181/vessel/lookup")) {
      return {
        success: true,
        vessel: { imo: "0000000", name: "Demo Vessel (offline)" },
      } as T;
    }
    if (path.startsWith("/v1/ai/v181/voyage/schema")) {
      return {
        success: true,
        schema_version: 1,
        required_keys: ["vessel_name", "cargo"],
      } as T;
    }
    if (method === "POST" && path.startsWith("/v1/ai/v181/translate")) {
      const body = options.body as { text?: string } | undefined;
      return {
        success: true,
        translated_text: `[offline] ${body?.text ?? ""}`,
      } as T;
    }
    if (method === "POST" && path.startsWith("/v1/ai/v181/entities/extract")) {
      return { success: true, entities: [], note: "offline demo" } as T;
    }
    if (method === "POST" && path.startsWith("/v1/ai/v181/voyage/extract")) {
      return { success: true, extracted: {}, note: "offline demo" } as T;
    }
    if (method === "PUT" && path.startsWith("/v1/users/location")) {
      return { success: true } as T;
    }
    if (method === "PUT" && path.startsWith("/v1/user/context")) {
      return { success: true } as T;
    }
    if (method === "GET" && path.startsWith("/v1/users/location")) {
      return { success: true, latitude: null, longitude: null } as T;
    }
    if (method === "GET" && path.startsWith("/v1/user/context")) {
      return { success: true } as T;
    }
    if (method === "POST" && path.startsWith("/v1/rooms")) {
      const body = options.body as { name?: string } | undefined;
      return {
        success: true,
        room_id: `!spoof_${Date.now()}:splash.local`,
        name: body?.name ?? "Room",
      } as T;
    }
    /* default Quint mock */
    return { success: true, spoof: true } as T;
  }

  /* ── Matrix (/_matrix/...) — should be unused in spoof after login ── */
  if (endpoint.startsWith("/_matrix")) {
    return {} as T;
  }

  /* ── Quint v2 ── */
  if (endpoint.startsWith("/quint-v2")) {
    return { success: true, results: [] } as T;
  }

  return { success: true } as T;
}

export function getSpoofFormDataMock<T>(): T {
  return {
    success: true,
    fileId: "spoof-file-id",
    fileURL: "#",
    message: "Offline demo — file not uploaded",
  } as T;
}
