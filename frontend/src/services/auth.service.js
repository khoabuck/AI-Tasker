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
  return Boolean(
    Number(user?.userId) > 0 &&
    String(user?.email || "").trim()
  );
};

const getCurrentUserFromStorage = () => {
  try {
    const storedUser = localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
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

const getFriendlyError = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  return (
    data?.message ||
    data?.Message ||
    data?.title ||
    data?.Title ||
    error?.message ||
    fallback
  );
};

const getResponseBody = (response) => {
  /*
   * Hỗ trợ cả hai trường hợp:
   * - auth.api trả thẳng response.data
   * - auth.api trả nguyên Axios response
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

const clearLegacyAuthStorage = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
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
       * Nếu response login chưa có đủ user thì kiểm tra lại
       * phiên HttpOnly cookie bằng /auth/me.
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
           * Một số trạng thái onboarding như
           * PENDING_ROLE hoặc PENDING_EMAIL_VERIFICATION
           * có thể chưa gọi được /auth/me.
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

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      /*
       * Dọn token cũ.
       * Không tạo token giả vì Backend dùng HttpOnly cookie.
       */
      clearLegacyAuthStorage();

      return {
        success: true,
        user,
        role: user.role,
        status: user.status,
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
      ).toUpperCase();

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
       * Dù Backend logout lỗi vẫn phải xóa auth state phía FE.
       */
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("currentUser");

      clearLegacyAuthStorage();

      localStorage.removeItem(
        "aitasker_expert_profile_setup_draft"
      );

      localStorage.removeItem(
        "aitasker_expert_profile_edit_draft"
      );

      localStorage.removeItem(
        "aitasker_expert_profile_correction_draft"
      );

      sessionStorage.clear();

      /*
       * Báo cho các tab khác biết user đã logout.
       */
      localStorage.setItem(
        "aitasker_logout_at",
        `${Date.now()}-${Math.random()}`
      );
    }
  },

  /*
   * Chỉ dùng làm UI cache để hiển thị tên/avatar.
   * Không dùng localStorage để xác thực hoặc phân quyền.
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

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

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
       * Nếu /auth/me lỗi thì cập nhật avatar vào UI cache hiện tại.
       */
    }

    return mergeUserToLocalStorage({
      avatarUrl: payload.avatarUrl,
    });
  },

  normalizeUser,
};

export default authService;