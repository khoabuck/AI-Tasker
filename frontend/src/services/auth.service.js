import {
  loginApi,
  logoutApi,
  loginWithGoogleApi,
  getMeApi,
  updateMyAvatarApi,
} from "../api/auth.api";

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

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const unwrapUserData = (data) => {
  if (!data) return null;

  if (data?.data?.user) return data.data.user;
  if (data?.data?.User) return data.data.User;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;

  if (data?.user) return data.user;
  if (data?.User) return data.User;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  if (data?.data) return data.data;

  return data;
};

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    userId: getValue(user.userId, user.UserId, user.id, user.Id, 0),
    email: getValue(user.email, user.Email, ""),
    fullName: getValue(
      user.fullName,
      user.FullName,
      user.displayName,
      user.DisplayName,
      user.name,
      user.Name,
      ""
    ),
    role: getValue(user.role, user.Role, ""),
    status: getValue(user.status, user.Status, ""),
    authProvider: getValue(
      user.authProvider,
      user.AuthProvider,
      user.provider,
      user.Provider,
      "LOCAL"
    ),
    avatarUrl: getValue(
      user.avatarUrl,
      user.AvatarUrl,
      user.avatar,
      user.Avatar,
      user.photoUrl,
      user.PhotoUrl,
      null
    ),
  };
};



const getCurrentUserFromStorage = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

const saveUserToLocalStorage = (user) => {
  if (!user) return null;

  const normalizedUser = normalizeUser(user);

  if (normalizedUser) {
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  }

  return normalizedUser;
};

const mergeUserToLocalStorage = (newUserData) => {
  const currentUser = getCurrentUserFromStorage();

  const mergedUser = normalizeUser({
    ...(currentUser || {}),
    ...(newUserData || {}),
  });

  if (mergedUser) {
    localStorage.setItem("user", JSON.stringify(mergedUser));
  }

  return mergedUser;
};

const getFriendlyError = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || error?.message || fallback;
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

    localStorage.setItem("user", JSON.stringify(userInfo));

    return {
      success: true,
      user: userInfo,
      role: userInfo.role,
      status: userInfo.status,
    };
  }

  try {
    const data = await loginApi(credentials);

    let user = normalizeUser(
      data?.user ||
        data?.User ||
        data?.data?.user ||
        data?.data?.User ||
        data?.data ||
        data
    );

    if (!user?.userId || !user?.email) {
      try {
        const meData = await getMeApi();
        user = normalizeUser(unwrapUserData(meData));
      } catch {
        // Nếu user đang PENDING_ROLE/PENDING_EMAIL_VERIFICATION mà /auth/me chưa cho qua,
        // giữ user từ response login để tiếp tục flow.
      }
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
      user,
      role: user.role,
      status: user.status,
    };
  } catch (error) {
    return {
      success: false,
      message: getFriendlyError(error, "Login failed."),
    };
  }
},

  loginWithGoogle: async () => {
    loginWithGoogleApi();
  },

  logout: async () => {
    try {
      await logoutApi();
    } catch {
      // Vẫn xóa local state nếu BE logout lỗi.
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("currentUser");

    localStorage.removeItem("aitasker_expert_profile_setup_draft");
    localStorage.removeItem("aitasker_expert_profile_edit_draft");
    localStorage.removeItem("aitasker_expert_profile_correction_draft");

    sessionStorage.clear();

    // Báo cho các tab khác biết user đã logout.
    localStorage.setItem("aitasker_logout_at", String(Date.now()));
  },

  getCurrentUser: () => {
    return getCurrentUserFromStorage();
  },

  getToken: () => {
    return null;
  },

  refreshCurrentUser: async () => {
    const data = await getMeApi();
    const user = normalizeUser(unwrapUserData(data));

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    return user;
  },

  updateMyAvatar: async (avatarUrlOrPayload) => {
    const payload =
      typeof avatarUrlOrPayload === "string"
        ? {
            avatarUrl: avatarUrlOrPayload,
          }
        : avatarUrlOrPayload;

    if (!payload?.avatarUrl) {
      throw new Error("Avatar URL is required.");
    }

    const data = await updateMyAvatarApi(payload);

    let updatedUser = normalizeUser(unwrapUserData(data));

    if (updatedUser?.userId) {
      return saveUserToLocalStorage(updatedUser);
    }

    try {
      updatedUser = await authService.refreshCurrentUser();

      if (updatedUser) return updatedUser;
    } catch {
      // Nếu refresh lỗi thì merge avatarUrl vào user hiện tại.
    }

    return mergeUserToLocalStorage({
      avatarUrl: payload.avatarUrl,
    });
  },

  isAuthenticated: () => {
    return Boolean(authService.getCurrentUser());
  },

  getRole: () => {
    return authService.getCurrentUser()?.role || null;
  },

  getStatus: () => {
    return authService.getCurrentUser()?.status || null;
  },

  normalizeUser,
};

export default authService;