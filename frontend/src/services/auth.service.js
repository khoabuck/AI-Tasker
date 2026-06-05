// src/services/auth.service.js

import authApi from "../api/auth.api";

// ─── Mock data để test khi chưa có BE ────────────────
const MOCK_USERS = [
  { email: "client@test.com", password: "123456", role: "CLIENT", userId: 1, fullName: "Test Client" },
  { email: "expert@test.com", password: "123456", role: "EXPERT", userId: 2, fullName: "Test Expert" },
  { email: "admin@test.com",  password: "123456", role: "ADMIN",  userId: 3, fullName: "Test Admin"  },
];

// ⚠️ Đổi thành false khi BE xong
const USE_MOCK = true;

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
        localStorage.setItem("token", "mock-token-" + user.role);
        localStorage.setItem("user", JSON.stringify(userInfo));
        return { success: true, role: user.role };
      }
      return { success: false, message: "Invalid email or password." };
    }

    try {
      const response = await authApi.login(credentials);
      const { token, role, userId, fullName } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ userId, fullName, role }));
      return { success: true, role };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Login failed." };
    }
  },

  // ─── Login với Google ─────────────────────────────────
  // googleToken: token nhận được từ Google sau khi user đồng ý
  loginWithGoogle: async (googleToken) => {
    if (USE_MOCK) {
      // Mock: giả sử Google login luôn thành công với role CLIENT
      await new Promise((res) => setTimeout(res, 800));
      const userInfo = { userId: 99, fullName: "Google User", role: "CLIENT" };
      localStorage.setItem("token", "mock-token-google");
      localStorage.setItem("user", JSON.stringify(userInfo));
      return { success: true, role: "CLIENT" };
    }

    // REAL MODE — gửi googleToken lên BE để verify
    // BE sẽ verify với Google → tạo/tìm user → trả về JWT
    try {
      const response = await authApi.loginWithGoogle(googleToken);
      const { token, role, userId, fullName } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ userId, fullName, role }));
      return { success: true, role };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Google login failed." };
    }
  },

  // ─── Logout ──────────────────────────────────────────
  logout: async () => {
    if (!USE_MOCK) {
      try { await authApi.logout(); } catch (e) {}
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // ─── Helpers ─────────────────────────────────────────
  getCurrentUser:  () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
  isAuthenticated: () => !!localStorage.getItem("token"),
  getRole:         () => authService.getCurrentUser()?.role || null,
};

export default authService;