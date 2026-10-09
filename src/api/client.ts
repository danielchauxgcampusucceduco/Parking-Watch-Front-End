import { API_URL } from "../config";

/** Error de la API con el código estable del documento problem+json del backend. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let onUnauthorized: () => void = () => {};

/** El token vive solo en memoria, nunca en el almacenamiento del navegador (RNF-3.1). */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/** Petición autenticada al backend; lanza ApiError con el detalle del servidor. */
export async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(API_URL + path, { ...init, headers });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    if (response.status === 401 && accessToken) {
      onUnauthorized();
    }
    throw new ApiError(
      response.status,
      problem.code ?? "HTTP_" + response.status,
      problem.detail ?? "La solicitud falló (" + response.status + ")",
    );
  }
  return response;
}

/** GET que retorna JSON. */
export async function getJson<T>(path: string): Promise<T> {
  return (await request(path)).json() as Promise<T>;
}

/** Envía JSON (POST, PUT o PATCH) y retorna la respuesta JSON, si la hay. */
export async function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await request(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Descarga un archivo autenticado (foto o exportación) como blob. */
export async function getBlob(path: string): Promise<Blob> {
  return (await request(path)).blob();
}
