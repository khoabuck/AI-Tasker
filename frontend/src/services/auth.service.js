import {
  getMeApi,
  loginApi,
  loginWithGoogleApi,
  logoutApi,
  updateMyAvatarApi,
} from "../api/auth.api";

const getValue = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
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
    userId: getValue(
      user.userId,
      user.UserId,
      user.id,
      user.Id,
      0
    ),

    email: getValue(
      user.email,
      user.Email,
      ""
    ),

    fullName: getValue(
      user.fullName,
      user.FullName,
      user.displayName,
      user.DisplayName,
      user.name,
      user.Name,
      ""
    ),

    role: getValue(
      user.role,
      user.Role,
      ""
    ),

    status: getValue(
      user.status,
      user.Status,
      user.userStatus,
      user.UserStatus,
      ""
    ),

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
  const userId = Number(user?.userId || 0);
  const email = String(user?.email || "").trim();

  return userId > 0 && Boolean(email);
};

const getCurrentUserFromStorage = () => {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return null;

    const parsedUser = JSON.parse(storedUser);
    const normalizedUser = normalizeUser(parsedUser);

    if (!isValidUser(normalizedUser)) {
      localStorage.removeItem("user");
      return null;
    }

    return normalizedUser;
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

  localStorage.setItem(
    "user",
    JSON.stringify(normalizedUser)
  );

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

  localStorage.setItem(
    "user",
    JSON.stringify(mergedUser)
  );

  return mergedUser;
};

const clearLegacyAuthStorage = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
};

const clearExpertProfileDrafts = () => {
  localStorage.removeItem(
    "aitasker_expert_profile_setup_draft"
  );

  localStorage.removeItem(
    "aitasker_expert_profile_edit_draft"
  );

  localStorage.removeItem(
    "aitasker_expert_profile_correction_draft"
  );
};

const getFriendlyError = (
  error,
  fallback = "Something went wrong."
) => {
  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors)
      .flat()
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return (
    data?.message ||
    data?.Message ||
    data?.title ||
    data?.Title ||
    data?.detail ||
    data?.Detail ||
    error?.message ||
    fallback
  );
};

const getResponseBody = (response) => {
  /*
   * Hỗ trợ hai trường hợp:
   * - auth.api trả response.data
   * - auth.api trả Axios response đầy đủ
   */
  if (
    response?.data &&
    (
      typeof response?.status === "number" ||
      response?.headers ||
      response?.config
    )
  ) {
    return response.data;
  }

  return response;
};

const authService = {
  login: async (credentials) => {
    try {
      const response = await loginApi(credentials);
      const body = getResponseBody(response);

      const loginData =
        body?.data ||
        body?.Data ||
        body ||
        {};

      let user = normalizeUser(
        loginData?.user ||
        loginData?.User ||
        body?.user ||
        body?.User
      );

      /*
       * Nếu login response chưa chứa đủ user,
       * xác minh lại bằng phiên HttpOnly cookie.
       */
      if (!isValidUser(user)) {
        try {
          const meResponse = await getMeApi();

          user = normalizeUser(
            unwrapUserData(
              getResponseBody(meResponse)
            )
          );
        } catch {
          /*
           * Một số trạng thái onboarding có thể chưa gọi được /auth/me.
           * Khi đó sẽ kiểm tra lại dữ liệu từ login response bên dưới.
           */
        }
      }

      if (!isValidUser(user)) {
        localStorage.removeItem("user");

        return {
          success: false,
          message:
            "Login response does not contain valid user information.",
        };
      }

      const savedUser = saveUserToLocalStorage(user);

      if (!savedUser) {
        return {
          success: false,
          message:
            "Unable to save the authenticated user information.",
        };
      }

      /*
       * Backend dùng HttpOnly cookie.
       * Không lưu hoặc tạo access token giả ở frontend.
       */
      clearLegacyAuthStorage();

      return {
        success: true,

        // Giữ field này để không làm hỏng code cũ đang đọc accessToken.
        accessToken: "",

        user: savedUser,
        role: savedUser.role,
        status: savedUser.status,

        expiresAt:
          loginData?.expiresAt ||
          loginData?.ExpiresAt ||
          body?.expiresAt ||
          body?.ExpiresAt ||
          null,
      };
    } catch (error) {
      const httpStatus = error?.response?.status;

      const responseData =
        error?.response?.data?.data ||
        error?.response?.data ||
        {};

      const errorCode = String(
        responseData?.code ||
        responseData?.Code ||
        ""
      )
        .trim()
        .toUpperCase();

      if (
        httpStatus === 429 &&
        errorCode === "LOGIN_TEMPORARILY_BLOCKED"
      ) {
        const retryAfterHeader =
          error?.response?.headers?.["retry-after"];

        const retryAfterSeconds = Number(
          responseData?.retryAfterSeconds ??
          responseData?.RetryAfterSeconds ??
          retryAfterHeader ??
          0
        );

        return {
          success: false,
          code: errorCode,

          message:
            responseData?.message ||
            responseData?.Message ||
            "Too many failed login attempts. Please try again later.",

          blockedUntilUtc:
            responseData?.blockedUntilUtc ||
            responseData?.BlockedUntilUtc ||
            null,

          retryAfterSeconds:
            Number.isFinite(retryAfterSeconds) &&
            retryAfterSeconds > 0
              ? retryAfterSeconds
              : 0,
        };
      }

      return {
        success: false,
        message: getFriendlyError(
          error,
          "Login failed."
        ),
      };
    }
  },

  loginWithGoogle: () => {
    return loginWithGoogleApi();
  },

  logout: async () => {
    try {
      /*
       * Backend phải được gọi để xóa HttpOnly cookie.
       */
      await logoutApi();
    } catch {
      /*
       * Dù API logout lỗi vẫn phải xóa auth state phía frontend.
       */
    } finally {
      clearLegacyAuthStorage();
      clearExpertProfileDrafts();

      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("currentUser");

      sessionStorage.clear();

      /*
       * Báo cho các tab khác rằng user đã logout.
       */
      localStorage.setItem(
        "aitasker_logout_at",
        `${Date.now()}-${Math.random()}`
      );
    }
  },

  /*
   * Chỉ dùng localStorage làm UI cache.
   * Không dùng để xác thực hoặc phân quyền.
   */
  getCurrentUser: () => {
    return getCurrentUserFromStorage();
  },

  /*
   * JWT nằm trong HttpOnly cookie nên JavaScript không đọc được.
   */
  getToken: () => {
    return null;
  },

  refreshCurrentUser: async () => {
    const response = await getMeApi();

    const user = normalizeUser(
      unwrapUserData(
        getResponseBody(response)
      )
    );

    if (!isValidUser(user)) {
      localStorage.removeItem("user");
      return null;
    }

    return saveUserToLocalStorage(user);
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

    const response = await updateMyAvatarApi(payload);

    let updatedUser = normalizeUser(
      unwrapUserData(
        getResponseBody(response)
      )
    );

    if (isValidUser(updatedUser)) {
      return saveUserToLocalStorage(updatedUser);
    }

    try {
      updatedUser =
        await authService.refreshCurrentUser();

      if (updatedUser) {
        return updatedUser;
      }
    } catch {
      /*
       * Nếu /auth/me lỗi thì chỉ cập nhật avatar trong UI cache.
       */
    }

    return mergeUserToLocalStorage({
      avatarUrl: payload.avatarUrl,
    });
  },

  /*
   * Giữ các method cũ để không ảnh hưởng page/service hiện tại.
   * Đây chỉ là kiểm tra UI cache, không phải xác thực bảo mật.
   */
  isAuthenticated: () => {
    return isValidUser(
      authService.getCurrentUser()
    );
  },

  getRole: () => {
    return (
      authService.getCurrentUser()?.role ||
      null
    );
  },

  getStatus: () => {
    return (
      authService.getCurrentUser()?.status ||
      null
    );
  },

  normalizeUser,

  isValidUser,
};

export default authService;