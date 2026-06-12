import { loginApi, loginWithGoogleApi, getMeApi } from "../api/auth.api";

const USE_MOCK = false;

const MOCK_USERS = [
  {
    email: "client@test.com",
    password: "123456",
    role: "CLIENT",
    status: "ACTIVE",
    userId: 1,
    fullName: "Test Client",
  },
  {
    email: "expert@test.com",
    password: "123456",
    role: "EXPERT",
    status: "ACTIVE",
    userId: 2,
    fullName: "Test Expert",
  },
  {
    email: "admin@test.com",
    password: "123456",
    role: "ADMIN",
    status: "ACTIVE",
    userId: 3,
    fullName: "Test Admin",
  },
];

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    userId: user.userId || user.UserId || 0,
    email: user.email || user.Email || "",
    fullName: user.fullName || user.FullName || "",
    role: user.role || user.Role || "",
    status: user.status || user.Status || "",
    authProvider: user.authProvider || user.AuthProvider || "LOCAL",
    avatarUrl: user.avatarUrl || user.AvatarUrl || null,
  };
};

const authService = {
  login: async (credentials) => {
    if (USE_MOCK) {
      await new Promise((res) => setTimeout(res, 500));

      const user = MOCK_USERS.find(
        (item) =>
          item.email === credentials.email &&
          item.password === credentials.password
      );

      if (!user) {
        return {
          success: false,
          message: "Invalid email or password.",
        };
      }

      const { password, ...userInfo } = user;
      const accessToken = "mock-token-" + userInfo.role;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(userInfo));

      return {
        success: true,
        accessToken,
        user: userInfo,
        role: userInfo.role,
        status: userInfo.status,
      };
    }

    try {
      const data = await loginApi(credentials);

      const accessToken =
        data?.accessToken ||
        data?.AccessToken ||
        data?.token ||
        data?.Token;

      if (!accessToken) {
        return {
          success: false,
          message: "Login response does not contain accessToken.",
        };
      }

      localStorage.setItem("accessToken", accessToken);

      let user = normalizeUser(data?.user || data?.User);

      try {
        const freshUser = await getMeApi();
        user = normalizeUser(freshUser);
      } catch {
        // Nếu /auth/me lỗi thì dùng user từ login response.
      }

      if (!user) {
        return {
          success: false,
          message: "Login response does not contain user information.",
        };
      }

      localStorage.setItem("user", JSON.stringify(user));

      return {
        success: true,
        accessToken,
        user,
        role: user.role,
        status: user.status,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || "Login failed.",
      };
    }
  },

  loginWithGoogle: async () => {
    loginWithGoogleApi();
  },

  logout: async () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    localStorage.removeItem("aitasker_expert_profile_setup_draft");
    localStorage.removeItem("aitasker_expert_profile_edit_draft");
    localStorage.removeItem("aitasker_expert_profile_correction_draft");
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated: () => {
    return Boolean(localStorage.getItem("accessToken"));
  },

  getRole: () => {
    return authService.getCurrentUser()?.role || null;
  },

  getStatus: () => {
    return authService.getCurrentUser()?.status || null;
  },
};

export default authService;