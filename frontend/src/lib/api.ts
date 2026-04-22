import { clearAuthCookie, getAuthCookie } from "@/lib/auth-cookie";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth-token") || getAuthCookie();
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(endpoint, {
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-token");
      localStorage.removeItem("auth-storage");
      clearAuthCookie();
      window.location.href = "/auth/login";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));
    throw new Error(
      error.message || error.error || error.errcode || "Request failed",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function fetchWithAuth(
  endpoint: string,
  init: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return fetch(endpoint, { ...init, headers });
}

/**
 * Maps logical Quint paths to the Next.js rewrite target.
 *
 * - Most routes are implemented in Flask as `/api/v1/...`. The browser uses
 *   `/quint-api/v1/...` which rewrites to `${QUINT_HOST}/api/v1/...` (nginx → Flask).
 * - Verification, accounts, username-availability, and profile live at `/v1/...`
 *   without the `/api` prefix. Those must use `/quint-v1/...` → `${QUINT_HOST}/v1/...`.
 * - Other `/v1/*` routes use `/quint-api/v1/...` → `${QUINT_HOST}/api/v1/...`.
 */
function quintApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (
    p.startsWith("/v1/verification/") ||
    p.startsWith("/v1/username/") ||
    p.startsWith("/v1/accounts/") ||
    p.startsWith("/v1/profile/")
  ) {
    return `/quint-v1${p.slice("/v1".length)}`;
  }
  return `/quint-api${p}`;
}

/** Quint API — see quintApiUrl */
export const quintApi = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(quintApiUrl(path), { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(quintApiUrl(path), {
      ...options,
      method: "POST",
      body,
    });
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(quintApiUrl(path), {
      ...options,
      method: "PUT",
      body,
    });
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(quintApiUrl(path), { ...options, method: "DELETE" });
  },
  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const response = await fetchWithAuth(quintApiUrl(path), {
      method: "POST",
      body: formData,
    });
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token");
        localStorage.removeItem("auth-storage");
        clearAuthCookie();
        window.location.href = "/auth/login";
      }
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || "Request failed");
    }
    return response.json() as Promise<T>;
  },
};

/** Matrix client-server API */
export const matrixApi = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(`/_matrix${path}`, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(`/_matrix${path}`, {
      ...options,
      method: "POST",
      body,
    });
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(`/_matrix${path}`, {
      ...options,
      method: "PUT",
      body,
    });
  },
};

/** Send a plain-text m.room.message to a Matrix room (same path as chat composer fallback). */
export async function sendMatrixRoomTextMessage(
  roomId: string,
  body: string,
): Promise<void> {
  const txnId = `m${Date.now()}`;
  await matrixApi.put(
    `/client/r0/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
    { msgtype: "m.text", body },
  );
}

/** Quint /v2/* routes (directory, contacts) */
export const quintV2 = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(`/quint-v2${path}`, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(`/quint-v2${path}`, {
      ...options,
      method: "POST",
      body,
    });
  },
};
