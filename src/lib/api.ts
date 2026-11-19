import type { ApiErrorPayload } from "./api-types";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function resolveBaseUrl(): string {
  const configured = import.meta.env["VITE_API_URL"];
  if (typeof window === "undefined") {
    const internal =
      typeof process !== "undefined" && process.env ? process.env["API_INTERNAL_URL"] : undefined;
    if (internal) return internal.replace(/\/$/, "");
    if (configured?.startsWith("http")) return configured.replace(/\/$/, "");
    return "http://127.0.0.1:8000/api/v1";
  }
  return (configured || "/api/v1").replace(/\/$/, "");
}

export const API_BASE = resolveBaseUrl();

export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    code = "error",
    fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function cookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

let csrfPromise: Promise<void> | null = null;

export function ensureCsrf(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (cookie("csrftoken")) return Promise.resolve();
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE}/auth/csrf/`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

export type QueryParams = Record<string, string | number | boolean | string[] | undefined | null>;

interface RequestOptions extends Omit<RequestInit, "body" | "method" | "signal"> {
  method?: string;
  signal?: AbortSignal | null;
  body?: unknown;
  formData?: FormData | undefined;
  params?: QueryParams | undefined;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, params, headers, ...rest } = options;
  const normalizedMethod = method.toUpperCase();
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) requestHeaders.set("Accept", "application/json");

  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    requestHeaders.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !SAFE_METHODS.has(normalizedMethod)) {
    await ensureCsrf();
    const token = cookie("csrftoken");
    if (token) requestHeaders.set("X-CSRFToken", token);
    requestHeaders.set("X-Requested-With", "XMLHttpRequest");
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...rest,
      method: normalizedMethod,
      headers: requestHeaders,
      body: payload ?? null,
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      "Unable to reach the TIE server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    const payload = (data && typeof data === "object" ? data : {}) as ApiErrorPayload;
    throw new ApiError(
      payload.error?.message ?? "The request could not be completed.",
      response.status,
      payload.error?.code ?? "error",
      payload.error?.fields ?? {},
    );
  }

  return data as T;
}

async function uploadRequest<T>(
  path: string,
  formData: FormData,
  method: "POST" | "PATCH",
  onProgress?: ((percent: number) => void) | undefined,
): Promise<T> {
  await ensureCsrf();
  const token = cookie("csrftoken");
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, buildUrl(path), true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    if (token) xhr.setRequestHeader("X-CSRFToken", token);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onerror = () =>
      reject(
        new ApiError(
          "Unable to upload media. Check your connection and try again.",
          0,
          "network_error",
        ),
      );
    xhr.onabort = () => reject(new ApiError("Upload cancelled.", 0, "upload_cancelled"));
    xhr.onload = () => {
      let data: unknown = null;
      if (xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = xhr.responseText;
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(data as T);
        return;
      }
      const payload = (data && typeof data === "object" ? data : {}) as ApiErrorPayload;
      reject(
        new ApiError(
          payload.error?.message ??
            (xhr.status === 413
              ? "The upload is too large for the server. Choose smaller files."
              : "The media upload could not be completed."),
          xhr.status,
          payload.error?.code ?? "upload_error",
          payload.error?.fields ?? {},
        ),
      );
    };
    xhr.send(formData);
  });
}

export const api = {
  get: <T>(path: string, params?: QueryParams, signal?: AbortSignal) =>
    request<T>(path, { params, ...(signal ? { signal } : {}) }),
  post: <T>(path: string, body?: unknown, formData?: FormData) =>
    request<T>(path, { method: "POST", body, formData }),
  patch: <T>(path: string, body?: unknown, formData?: FormData) =>
    request<T>(path, { method: "PATCH", body, formData }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(
    path: string,
    formData: FormData,
    options: { method?: "POST" | "PATCH"; onProgress?: (percent: number) => void } = {},
  ) => uploadRequest<T>(path, formData, options.method ?? "POST", options.onProgress),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
