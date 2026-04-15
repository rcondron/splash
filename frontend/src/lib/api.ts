import { clearAuthCookie, getAuthCookie } from "@/lib/auth-cookie";
import {
  getSpoofFormDataMock,
  getSpoofMockResponse,
  isSpoofAuthToken,
} from "@/lib/spoof";

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

  if (typeof window !== "undefined" && isSpoofAuthToken(getStoredToken())) {
    return getSpoofMockResponse<T>(endpoint, {
      method: (rest as RequestInit).method || "GET",
      body,
    });
  }

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

/** Quint API — routes under /api/v1/* on the remote server */
export const quintApi = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(`/quint-api${path}`, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(`/quint-api${path}`, {
      ...options,
      method: "POST",
      body,
    });
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(`/quint-api${path}`, {
      ...options,
      method: "PUT",
      body,
    });
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(`/quint-api${path}`, { ...options, method: "DELETE" });
  },
  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    if (typeof window !== "undefined" && isSpoofAuthToken(getStoredToken())) {
      return getSpoofFormDataMock<T>();
    }
    const response = await fetchWithAuth(`/quint-api${path}`, {
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
};

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

/** Backwards-compat generic api object */
export const api = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" });
  },
  post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "POST", body });
  },
  put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PUT", body });
  },
  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PATCH", body });
  },
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetchWithAuth(endpoint, {
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
  async getBlob(endpoint: string): Promise<Blob> {
    const response = await fetchWithAuth(endpoint, { method: "GET" });
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
      throw new Error(response.statusText || "Request failed");
    }
    return response.blob();
  },
};
