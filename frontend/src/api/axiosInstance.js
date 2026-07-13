import axios from "axios";

const cleanUrl = (url) => String(url || "").trim().replace(/\/+$/, "");

const getApiBaseUrl = () => {
  const apiBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL);

  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL");
  }

  return apiBaseUrl;
};

const ACCOUNT_BLOCKED_EVENT = "aitasker-account-blocked";
const AUTH_ERROR_EVENT = "aitasker-auth-error";

const normalizeRequestUrl = (config) => {
  return String(config?.url || "").toLowerCase();
};

const isAuthMeRequest = (config) => {
  return normalizeRequestUrl(config).includes("/auth/me");
};

const isPublicAuthRequest = (config) => {
  const url = normalizeRequestUrl(config);

  const publicAuthPaths = [
    "/auth/login",
    "/auth/register",
    "/auth/google-login",
    "/auth/google-callback",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/auth/resend-verification",
    "/auth/logout",
  ];

  return publicAuthPaths.some((path) => url.includes(path));
};

const dispatchAuthErrorEvent = (error) => {
  if (typeof window === "undefined") return;

  if (isAuthMeRequest(error?.config)) return;
  if (isPublicAuthRequest(error?.config)) return;

  window.dispatchEvent(
    new CustomEvent(AUTH_ERROR_EVENT, {
      detail: {
        status: error?.response?.status,
        url: error?.config?.url || "",
      },
    })
  );
};

const isFormDataRequest = (data) => {
  return typeof FormData !== "undefined" && data instanceof FormData;
};

const removeContentTypeHeader = (headers) => {
  if (!headers) return;

  // AxiosHeaders in Axios 1.x
  if (typeof headers.delete === "function") {
    headers.delete("Content-Type");
    headers.delete("content-type");
    return;
  }

  // Plain object fallback
  delete headers["Content-Type"];
  delete headers["content-type"];
};

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    /*
     * Never force application/json for FormData.
     * The browser must generate:
     * multipart/form-data; boundary=----WebKitFormBoundary...
     *
     * Setting multipart/form-data manually without the boundary can also cause
     * ASP.NET Core to return HTTP 415.
     */
    if (isFormDataRequest(config.data)) {
      removeContentTypeHeader(config.headers);
    } else if (
      config.data !== undefined &&
      config.data !== null &&
      !config.headers?.["Content-Type"] &&
      !config.headers?.["content-type"]
    ) {
      if (typeof config.headers?.set === "function") {
        config.headers.set("Content-Type", "application/json");
      } else {
        config.headers = {
          ...(config.headers || {}),
          "Content-Type": "application/json",
        };
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
      dispatchAuthErrorEvent(error);
    }

    return Promise.reject(error);
  }
);

export { ACCOUNT_BLOCKED_EVENT, AUTH_ERROR_EVENT };
export default axiosInstance;
