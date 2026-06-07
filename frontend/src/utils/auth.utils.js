// Lưu accessToken và user vào localStorage
export const saveAuth = (authData) => {
  if (!authData) return;
  if (authData.accessToken) {
    localStorage.setItem("accessToken", authData.accessToken);
  }
  if (authData.user) {
    localStorage.setItem("user", JSON.stringify(authData.user));
  }
};

export const getAccessToken = () => localStorage.getItem("accessToken");

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
  localStorage.removeItem("user");
};

// Lấy message lỗi từ response backend
// Backend trả { success: false, message: "..." }
export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    "Đã có lỗi xảy ra."
  );
};