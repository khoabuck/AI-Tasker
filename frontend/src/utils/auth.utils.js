export const saveAuth = (authData) => {
  if (!authData) return;

  if (authData.accessToken) {
    localStorage.setItem("accessToken", authData.accessToken);
  } else {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
  }

  if (authData.user) {
    localStorage.setItem("user", JSON.stringify(authData.user));
  }
};

export const getAccessToken = () => localStorage.getItem("accessToken");

export const hasAuthSession = () => {
  return Boolean(localStorage.getItem("user") || localStorage.getItem("accessToken"));
};

export const getUserFromStorage = () => {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAuth = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
};

export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    "Đã có lỗi xảy ra."
  );
};