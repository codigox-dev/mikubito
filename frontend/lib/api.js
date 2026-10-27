import { clearStoredToken, getStoredToken } from "./auth-storage";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status = 0, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(
  path,
  { method = "GET", body, headers = {}, signal } = {}
) {
  const token = getStoredToken();
  const hasBody = body !== undefined;

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: hasBody ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "No se pudo conectar con el servidor. Comprueba tu conexión.",
      0
    );
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredToken();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cubito:unauthorized"));
      }
    }

    throw new ApiError(
      payload?.error?.message || "No se pudo completar la solicitud.",
      response.status,
      payload?.error?.details
    );
  }

  return payload;
}
