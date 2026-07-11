import axios from "axios";

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const backendBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL?.trim();

  if (backendBaseUrl) {
    return `${backendBaseUrl.replace(/\/+$/, "")}/api`;
  }

  if (import.meta.env.DEV) {
    return "http://localhost:5070/api";
  }

  return "";
};

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

export default axiosInstance;