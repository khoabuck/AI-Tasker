import {
  loginApi,
  logoutApi,
  loginWithGoogleApi,
  getMeApi,
  updateMyAvatarApi,
} from "../api/auth.api";



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

const isValidUser = (user) => {
  return Boolean(Number(user?.userId) > 0 && user?.email);
};



const getCurrentUserFromStorage = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

const saveUserToLocalStorage = (user) => {
  if (!user) return null;

  const normalizedUser = normalizeUser(user);

  if (!isValidUser(normalizedUser)) {
    localStorage.removeItem("user");
    return null;
  }

  localStorage.setItem("user", JSON.stringify(normalizedUser));

  return normalizedUser;
};

const mergeUserToLocalStorage = (newUserData) => {
  const currentUser = getCurrentUserFromStorage();

  const mergedUser = normalizeUser({
    ...(currentUser || {}),
    ...(newUserData || {}),
  });

  if (!isValidUser(mergedUser)) {
    return null;
  }

  localStorage.setItem("user", JSON.stringify(mergedUser));

  return mergedUser;
};

const getFriendlyError = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || error?.message || fallback;
};

const authService = {
  login: async (credentials) => {
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

    if (!isValidUser(user)) {
      return {
        success: false,
        message: "Login response does not contain valid user information.",
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

    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("currentUser");

    localStorage.removeItem("aitasker_expert_profile_setup_draft");
    localStorage.removeItem("aitasker_expert_profile_edit_draft");
    localStorage.removeItem("aitasker_expert_profile_correction_draft");

    sessionStorage.clear();

    // Báo cho các tab khác biết user đã logout.
    localStorage.setItem(
      "aitasker_logout_at",
      `${Date.now()}-${Math.random()}`
    );
  },

    // Chỉ dùng làm UI cache, ví dụ hiển thị tên/avatar.
    // Không dùng hàm này để phân quyền route.
    getCurrentUser: () => {
      return getCurrentUserFromStorage();
    },

    getToken: () => {
      return null;
    },

    refreshCurrentUser: async () => {
    const data = await getMeApi();
    const user = normalizeUser(unwrapUserData(data));

    if (!isValidUser(user)) {
      localStorage.removeItem("user");
      return null;
    }

    localStorage.setItem("user", JSON.stringify(user));

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

    if (isValidUser(updatedUser)) {
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

  
  normalizeUser,
};

export default authService;