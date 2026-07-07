import axiosInstance from "./axiosInstance";

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL?.replace(/\/+$/, "");

if (!BACKEND_BASE_URL) {
  throw new Error("Missing VITE_BACKEND_BASE_URL");
}

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

export const loginApi = async ({ email, password }) => {
  const res = await axiosInstance.post("/auth/login", {
    email,
    password,
  });

  return res.data;
};

export const logoutApi = async () => {
  const res = await axiosInstance.post("/auth/logout");
  return res.data;
};

export const loginWithGoogleApi = () => {
  window.location.href = `${BACKEND_BASE_URL}/api/auth/google-login`;
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
  selectRoleApi,
  updateMyAvatarApi,
};