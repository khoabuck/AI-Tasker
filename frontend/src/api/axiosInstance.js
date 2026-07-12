import axios from "axios";

const cleanUrl = (url) => String(url || "").trim().replace(/\/+$/, "");

const getApiBaseUrl = () => {
  const apiBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL);

  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL");
  }

  return apiBaseUrl;
};

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
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
      console.log("SEND TOKEN:", Boolean(token));
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;