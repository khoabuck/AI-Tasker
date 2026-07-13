// Chỉ lưu user để hiển thị UI.
// Phiên đăng nhập nằm trong HttpOnly cookie do backend set.
export const saveAuth = (authData) => {
  if (!authData) return;

  if (authData.user) {
    localStorage.setItem("user", JSON.stringify(authData.user));
  }
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
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("currentUser");

  // Xóa dữ liệu còn sót từ cơ chế Bearer token cũ.
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
};

// Lấy message lỗi từ response backend
// Backend trả { success: false, message: "..." }
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
    responseData?.data?.message ||
    responseData?.data?.Message ||
    error?.message ||
    "An error has occurred."
  );
};