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

const isAccountBlockedError = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data;

  const message = String(
    data?.message ||
      data?.title ||
      data?.detail ||
      data?.error ||
      data ||
      error?.message ||
      ""
  ).toLowerCase();

  if (![401, 403].includes(status)) return false;

  return (
    message.includes("locked") ||
    message.includes("lock") ||
    message.includes("banned") ||
    message.includes("ban") ||
    message.includes("suspended") ||
    message.includes("inactive") ||
    message.includes("disabled") ||
    message.includes("blocked") ||
    message.includes("account status") ||
    message.includes("tài khoản")
  );
};

const getAccountBlockedMessage = (error) => {
  const data = error?.response?.data;

  return (
    data?.message ||
    data?.title ||
    data?.detail ||
    data?.error ||
    "Your account has been locked or banned. Please login again."
  );
};

const dispatchAccountBlockedEvent = (error) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(ACCOUNT_BLOCKED_EVENT, {
      detail: {
        message: getAccountBlockedMessage(error),
        status: error?.response?.status,
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
    if (isAccountBlockedError(error)) {
      dispatchAccountBlockedEvent(error);
    }

    return Promise.reject(error);
  }
);

export { ACCOUNT_BLOCKED_EVENT };
export default axiosInstance;