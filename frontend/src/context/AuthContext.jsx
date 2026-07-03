import { createContext, useContext, useEffect, useState } from "react";
import { getMeApi } from "../api/auth.api";
import { getAccessToken, saveAuth, clearAuth, getUserFromStorage } from "../utils/auth.utils";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi reload trang: nếu có token thì gọi /auth/me để lấy user mới nhất
  // code mới
  useEffect(() => {
    const restore = async () => {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }

      // Nếu user đã lưu sẵn trong localStorage cho biết họ đang ở trạng thái
      // "chưa hoàn tất" (chưa chọn role, hoặc chưa xác thực email), thì KHÔNG
      // gọi /auth/me để xác thực lại — vì:
      // 1) Token vừa được cấp vài giây trước lúc login, chắc chắn còn hợp lệ.
      // 2) BE có thể từ chối /auth/me (401) cho user chưa có role đầy đủ,
      //    khiến effect này tự xóa mất token đúng lúc user đang đứng ở
      //    SelectRolePage chuẩn bị bấm Confirm — đây chính là nguyên nhân
      //    gây lỗi 401 "thỉnh thoảng mới bị" khi chọn role.
      const storedUser = getUserFromStorage();
      const storedStatus = String(storedUser?.status || "").toUpperCase();
      const isIncompleteOnboarding = [
        "PENDING_ROLE",
        "PENDING_EMAIL_VERIFICATION",
      ].includes(storedStatus);

      if (isIncompleteOnboarding && storedUser) {
        setUser(storedUser);
        setLoading(false);
        return;
      }

      try {
        const res = await getMeApi();
        const freshUser = res?.data?.data || res?.data || res;

        setUser(freshUser);
        saveAuth({ user: freshUser });
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          clearAuth();
          setUser(null);
        } else {
          const stored = getUserFromStorage();
          if (stored) setUser(stored);
        }
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  // Gọi sau khi login thành công
  const handleLoginSuccess = (authData) => {
    saveAuth(authData);
    setUser(authData.user);
  };

  // Gọi để lấy lại user mới nhất từ server
  const refreshUser = async () => {
    try {
      const res = await getMeApi();
      const freshUser = res?.data?.data || res?.data || res;

      setUser(freshUser);
      saveAuth({ user: freshUser });
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        clearAuth();
        setUser(null);
      } else {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      }
    }
  };

  const handleLogout = () => {
    clearAuth();

    localStorage.removeItem("aitasker_expert_profile_setup_draft");
    localStorage.removeItem("aitasker_expert_profile_edit_draft");
    localStorage.removeItem("aitasker_expert_profile_correction_draft");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        handleLoginSuccess,
        handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong AuthProvider");
  return ctx;
}