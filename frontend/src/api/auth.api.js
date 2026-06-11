import axiosInstance from "./axiosInstance";

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5070";

// POST /api/auth/register
// Không trả accessToken — user phải verify email trước
export const registerApi = async ({ fullName, email, password }) => {
  const res = await axiosInstance.post("/auth/register", { fullName, email, password });
  return res.data;
};

// GET /api/auth/verify-email?token=xxx
export const verifyEmailApi = async (token) => {
  const res = await axiosInstance.get("/auth/verify-email", { params: { token } });
  return res.data;
};

// POST /api/auth/resend-verification-email
export const resendVerificationEmailApi = async ({ email }) => {
  const res = await axiosInstance.post("/auth/resend-verification-email", { email });
  return res.data;
};

// POST /api/auth/login
// Trả về { accessToken, expiresAt, user }
export const loginApi = async ({ email, password }) => {
  const res = await axiosInstance.post("/auth/login", { email, password });
  return res.data;
};

// GET /api/auth/google-login — redirect browser, không dùng axios
export const loginWithGoogleApi = () => {
  window.location.href = `${BACKEND_BASE_URL}/api/auth/google-login`;
};

// GET /api/auth/me
export const getMeApi = async () => {
  const res = await axiosInstance.get("/auth/me");
  return res.data;
};

// POST /api/auth/forgot-password
export const forgotPasswordApi = async ({ email }) => {
  const res = await axiosInstance.post("/auth/forgot-password", { email });
  return res.data;
};

// POST /api/auth/reset-password
// token lấy từ URL: /reset-password?token=xxx
export const resetPasswordApi = async ({ token, newPassword, confirmPassword }) => {
  const res = await axiosInstance.post("/auth/reset-password", {
    token,
    newPassword,
    confirmPassword,
  });
  return res.data;
};