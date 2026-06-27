import {
  loginApi,
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

const extractAccessToken = (data) => {
  return getValue(
    data?.accessToken,
    data?.AccessToken,
    data?.token,
    data?.Token,
    data?.data?.accessToken,
    data?.data?.AccessToken,
    data?.data?.token,
    data?.data?.Token
  );
};

const decodeJwtPayload = (token) => {
  try {
    if (!token || !token.includes(".")) return null;

    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => {
          return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getRoleFromToken = (token) => {
  const payload = decodeJwtPayload(token);

  return getValue(
    payload?.role,
    payload?.Role,
    payload?.[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ],
    payload?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"
    ],
    ""
  );
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

      const accessToken = extractAccessToken(data);

      if (!accessToken) {
        return {
          success: false,
          message: "Login response does not contain accessToken.",
        };
      }

      localStorage.setItem("accessToken", accessToken);

      let user = normalizeUser(unwrapUserData(data));

      try {
        const freshUser = await getMeApi();
        const freshNormalizedUser = normalizeUser(unwrapUserData(freshUser));

        if (freshNormalizedUser) {
          user = freshNormalizedUser;
        }
      } catch {
        // Nếu /auth/me lỗi thì dùng user từ login response.
      }

      const tokenRole = getRoleFromToken(accessToken);

      if (!user) {
        user = normalizeUser({
          role: tokenRole,
          status: "ACTIVE",
        });
      }

      if (!user?.role || !user?.status) {
        user = normalizeUser({
          ...user,
          role: user?.role || tokenRole || "",
          status: user?.status || "ACTIVE",
        });
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
        message: getFriendlyError(error, "Login failed."),
      };
    }
  },

  loginWithGoogle: async () => {
    loginWithGoogleApi();
  },

  logout: async () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");

    localStorage.removeItem("aitasker_expert_profile_setup_draft");
    localStorage.removeItem("aitasker_expert_profile_edit_draft");
    localStorage.removeItem("aitasker_expert_profile_correction_draft");

    sessionStorage.clear();
  },

  getCurrentUser: () => {
    return getCurrentUserFromStorage();
  },

  getToken: () => {
    return localStorage.getItem("accessToken");
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
    return Boolean(localStorage.getItem("accessToken"));
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