import axiosInstance from "./axiosInstance";

const getAuthRedirectUrl = (path) => {
  const configuredApiBaseUrl = String(
    axiosInstance.defaults.baseURL || ""
  ).trim();

  if (!configuredApiBaseUrl) {
    throw new Error("Missing API base URL configuration.");
  }

  const apiBaseUrl = configuredApiBaseUrl.endsWith("/")
    ? configuredApiBaseUrl
    : `${configuredApiBaseUrl}/`;

  const absoluteApiBaseUrl = new URL(
    apiBaseUrl,
    window.location.origin
  );

  const normalizedPath = String(path || "").replace(/^\/+/, "");

  return new URL(normalizedPath, absoluteApiBaseUrl).toString();
};

// POST /api/auth/register
// Không trả token đăng nhập về frontend — user phải verify email trước
export const registerApi = async ({ fullName, email, password }) => {
  const res = await axiosInstance.post("/auth/register", {
    fullName,
    email,
    password,
  });

  return res.data;
};

export const verifyEmailApi = async (token) => {
  const res = await axiosInstance.get("/auth/verify-email", {
    params: { token },
  });

  return res.data;
};

export const resendVerificationEmailApi = async ({ email }) => {
  const res = await axiosInstance.post("/auth/resend-verification-email", {
    email,
  });

  return res.data;
};

// POST /api/auth/login
// Backend set JWT vào HttpOnly cookie.
export const loginApi = async ({ email, password }) => {
  const res = await axiosInstance.post("/auth/login", {
    email,
    password,
  });

  return res.data;
};

// POST /api/auth/logout
// Backend clear HttpOnly cookie.
export const logoutApi = async () => {
  const res = await axiosInstance.post("/auth/logout");

  return res.data;
};

export const loginWithGoogleApi = () => {
  const redirectUrl = getAuthRedirectUrl("auth/google-login");

  window.location.assign(redirectUrl);
};

export const getMeApi = async () => {
  const res = await axiosInstance.get("/auth/me");

  return res.data;
};

export const forgotPasswordApi = async ({ email }) => {
  const res = await axiosInstance.post("/auth/forgot-password", {
    email,
  });

  return res.data;
};

export const resetPasswordApi = async ({
  token,
  newPassword,
  confirmPassword,
}) => {
  const res = await axiosInstance.post("/auth/reset-password", {
    token,
    newPassword,
    confirmPassword,
  });

  return res.data;
};

/* ===========================
   CHANGE PASSWORD
=========================== */

export const changePasswordApi = async ({
  currentPassword,
  newPassword,
  confirmNewPassword,
}) => {
  const res = await axiosInstance.post("/auth/change-password", {
    currentPassword,
    newPassword,
    confirmNewPassword,
  });

  return res.data;
};

export const selectRoleApi = async ({ role }) => {
  const res = await axiosInstance.post("/auth/select-role", {
    role,
  });

  return res.data;
};

export const updateMyAvatarApi = async (avatarUrlOrPayload) => {
  const payload =
    typeof avatarUrlOrPayload === "string"
      ? {
          avatarUrl: avatarUrlOrPayload,
        }
      : avatarUrlOrPayload;

  const res = await axiosInstance.put("/auth/me/avatar", payload);

  return res.data;
};

export default {
  registerApi,
  verifyEmailApi,
  resendVerificationEmailApi,
  loginApi,
  logoutApi,
  loginWithGoogleApi,
  getMeApi,
  forgotPasswordApi,
  resetPasswordApi,
  changePasswordApi,
  selectRoleApi,
  updateMyAvatarApi,
};