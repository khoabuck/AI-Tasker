const LEGACY_TOKEN_KEYS = [
  "accessToken",
  "token",
  "authToken",
  "refreshToken",
];

const clearLegacyTokens = () => {
  LEGACY_TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
};

/*
 * Chỉ lưu thông tin user để phục vụ hiển thị UI.
 * Phiên đăng nhập thực tế nằm trong HttpOnly cookie do backend quản lý.
 */
export const saveAuth = (authData) => {
  if (!authData) return;

  // Dọn dữ liệu token cũ còn sót lại từ cơ chế Bearer token trước đây.
  clearLegacyTokens();

  if (authData.user) {
    localStorage.setItem(
      "user",
      JSON.stringify(authData.user)
    );
  }
};

/*
 * Chỉ kiểm tra xem frontend có user cache hay không.
 * Không dùng hàm này làm kiểm tra bảo mật hoặc phân quyền.
 */
export const hasAuthSession = () => {
  return Boolean(localStorage.getItem("user"));
};

export const getUserFromStorage = () => {
  const raw = localStorage.getItem("user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

export const clearAuth = () => {
  clearLegacyTokens();

  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("activeSessionId");

  sessionStorage.removeItem("sessionId");
};

export const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.Message ||
    responseData?.title ||
    responseData?.Title ||
    responseData?.detail ||
    responseData?.Detail ||
    responseData?.data?.message ||
    responseData?.data?.Message ||
    responseData?.data?.title ||
    responseData?.data?.Title ||
    responseData?.data?.detail ||
    responseData?.data?.Detail ||
    error?.message ||
    "An error has occurred."
  );
};