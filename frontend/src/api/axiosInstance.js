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

const isAuthMeRequest = (config) => {
  return String(config?.url || "").includes("/auth/me");
};

const dispatchAuthErrorEvent = (error) => {
  if (typeof window === "undefined") return;
  if (isAuthMeRequest(error?.config)) return;

  window.dispatchEvent(
    new CustomEvent(AUTH_ERROR_EVENT, {
      detail: {
        status: error?.response?.status,
        url: error?.config?.url || "",
      },
    })
  );
};

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log("REQUEST URL:", `${config.baseURL}${config.url}`);
      console.log("AUTH MODE:", token ? "Bearer fallback" : "HttpOnly cookie");
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