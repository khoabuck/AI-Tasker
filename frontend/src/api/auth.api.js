// src/api/auth.api.js
// Tầng API — chỉ gọi HTTP, không xử lý logic
// Nhận data thô từ BE và trả về, service sẽ xử lý tiếp

import axiosInstance from "./axiosInstance";

const authApi = {
  // POST /api/auth/login
  // body: { email, password }
  login: (credentials) => {
    return axiosInstance.post("/auth/login", credentials);
  },

  // POST /api/auth/register
  // body: { email, password, fullName }
  register: (userData) => {
    return axiosInstance.post("/auth/register", userData);
  },

  // POST /api/auth/logout
  logout: () => {
    return axiosInstance.post("/auth/logout");
  },

  // GET /api/auth/me — lấy thông tin user đang login
  getMe: () => {
    return axiosInstance.get("/auth/me");
  },
};

export default authApi;