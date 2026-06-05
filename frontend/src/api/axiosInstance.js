// src/api/axiosInstance.js
// Cấu hình axios dùng chung cho toàn bộ app
// Mọi file api khác đều import instance này thay vì dùng axios trực tiếp

import axios from "axios";

const axiosInstance = axios.create({
  // ⚠️ Khi BE xong, đổi URL này thành URL thật của BE
  baseURL: "http://localhost:8080/api",
  timeout: 10000, // 10 giây timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor ──────────────────────────────
// Chạy trước MỌI request — tự động đính token vào header
axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (được lưu sau khi login)
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────
// Chạy sau MỌI response — xử lý lỗi tập trung
axiosInstance.interceptors.response.use(
  (response) => response, // thành công thì trả về bình thường

  (error) => {
    // 401 = token hết hạn hoặc không hợp lệ → logout
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;