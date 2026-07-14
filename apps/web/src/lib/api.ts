import type { ApiErrorResponse } from "@repo/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Thrown for any non-2xx response from the API. `code` is one of
 * @repo/shared's ErrorCode values (or "INTERNAL_ERROR" if the body couldn't
 * be parsed), so callers can special-case things like INSUFFICIENT_CREDITS.
 */
export class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    let body: ApiErrorResponse | null = null;
    try {
      body = (await res.json()) as ApiErrorResponse;
    } catch {
      // ignore — body wasn't JSON
    }
    throw new ApiRequestError(
      body?.error?.code ?? "INTERNAL_ERROR",
      body?.error?.message ?? res.statusText ?? "Request failed",
      res.status,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};
