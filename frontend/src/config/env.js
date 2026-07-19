const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim();


if (!apiBaseUrl) {
  throw new Error(
    "Missing VITE_API_BASE_URL"
  );
}


export const API_BASE_URL =
  apiBaseUrl.replace(/\/+$/, "");


export const BACKEND_URL =
  API_BASE_URL.replace("/api", "");