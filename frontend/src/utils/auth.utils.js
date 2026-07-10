const LEGACY_TOKEN_KEYS = ["accessToken", "token", "authToken"];

const clearLegacyTokens = () => {
  LEGACY_TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
};

export const saveAuth = (authData) => {
  if (!authData) return;

  // Dọn token cũ còn sót lại từ phiên bản trước.
  clearLegacyTokens();

  if (authData.user) {
    localStorage.setItem("user", JSON.stringify(authData.user));
  }
};

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
  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  return (
    data?.message ||
    data?.title ||
    data?.detail ||
    error?.message ||
    "Đã có lỗi xảy ra."
  );
};