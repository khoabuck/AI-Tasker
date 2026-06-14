// src/services/auth.service.js

import { loginApi, loginWithGoogleApi, getMeApi } from "../api/auth.api";

// ─── Mock data để test khi chưa có BE ────────────────
const MOCK_USERS = [
  { email: "client@test.com", password: "123456", role: "CLIENT", status: "ACTIVE", userId: 1, fullName: "Test Client" },
  { email: "expert@test.com", password: "123456", role: "EXPERT", status: "ACTIVE", userId: 2, fullName: "Test Expert" },
  { email: "admin@test.com",  password: "123456", role: "ADMIN",  status: "ACTIVE", userId: 3, fullName: "Test Admin"  },
];

// ⚠️ Đổi thành false khi BE xong
const USE_MOCK = false;

const authService = {
  // ─── Login thường ────────────────────────────────────
  login: async (credentials) => {
    if (USE_MOCK) {
      await new Promise((res) => setTimeout(res, 800));
      const user = MOCK_USERS.find(
        (u) => u.email === credentials.email && u.password === credentials.password
      );
      if (user) {
        const { password, ...userInfo } = user;
        localStorage.setItem("accessToken", "mock-token-" + user.role);
        localStorage.setItem("user", JSON.stringify(userInfo));
        return { success: true, role: user.role, status: user.status };
      }
      return { success: false, message: "Invalid email or password." };
    }

    // REAL MODE
try {
  const data = await loginApi(credentials);
  const { accessToken } = data;

  localStorage.setItem("accessToken", accessToken);

  let user = data.user;

  if (!user) {
    user = await getMeApi();
  }

  if (!user?.role || !user?.status) {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));

    const tokenRole =
      payload.role ||
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

    user = {
      ...user,
      role: user?.role || tokenRole || null,
      status: user?.status || "ACTIVE",
    };
  }

  localStorage.setItem("user", JSON.stringify(user));

  return {
    success: true,
    role: user.role,
    status: user.status,
  };
} catch (error) {
  return {
    success: false,
    message: error.response?.data?.message || "Login failed.",
  };
}
  },

  // ─── Login với Google ─────────────────────────────────
  loginWithGoogle: async () => {
    if (USE_MOCK) {
      await new Promise((res) => setTimeout(res, 800));
      const userInfo = { userId: 99, fullName: "Google User", role: "CLIENT", status: "ACTIVE" };
      localStorage.setItem("accessToken", "mock-token-google");
      localStorage.setItem("user", JSON.stringify(userInfo));
      return { success: true, role: "CLIENT", status: "ACTIVE" };
    }
    // REAL MODE — redirect browser về backend
    loginWithGoogleApi();
  },

  // ─── Logout ──────────────────────────────────────────
  logout: async () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
  sessionStorage.clear();
  },

  // ─── Helpers ─────────────────────────────────────────
  getCurrentUser: () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
  },

  getToken: () => localStorage.getItem("accessToken"),

  isAuthenticated: () => !!localStorage.getItem("accessToken"),

  getRole: () => authService.getCurrentUser()?.role || null,

  getStatus: () => authService.getCurrentUser()?.status || null,
};

export default authService;