// Chỉ lưu user để hiển thị UI.
// JWT/accessToken nằm trong HttpOnly cookie do backend set.
export const saveAuth = (authData) => {
  if (!authData) return;

  if (authData.user) {
    localStorage.setItem("user", JSON.stringify(authData.user));
  }
};

// Giữ hàm này để tránh lỗi import cũ.
// Không dùng localStorage để xác thực nữa.
export const getAccessToken = () => null;

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
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("currentUser");
};

// Lấy message lỗi từ response backend
// Backend trả { success: false, message: "..." }
export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    "An error has occurred."
  );
};