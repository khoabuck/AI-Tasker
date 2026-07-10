import { createContext, useContext, useEffect, useState } from "react";
import { getMeApi } from "../api/auth.api";
import authService from "../services/auth.service";
import { saveAuth, clearAuth } from "../utils/auth.utils";

const AuthContext = createContext(null);

const extractUser = (res) => {
  const data = res?.data ?? res;

  return (
    data?.data?.user ||
    data?.data?.User ||
    data?.data ||
    data?.user ||
    data?.User ||
    data
  );
};

const isValidUser = (user) => {
  return Boolean(user?.userId || user?.UserId || user?.email || user?.Email);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi reload trang: luôn gọi /auth/me để backend kiểm tra HttpOnly cookie.
  // Không dùng localStorage làm nguồn xác thực/phân quyền.
  useEffect(() => {
    const restore = async () => {
      try {
        const res = await getMeApi();
        const freshUser = extractUser(res);

        if (!isValidUser(freshUser)) {
          clearAuth();
          setUser(null);
          return;
        }

        setUser(freshUser);
        saveAuth({ user: freshUser });
      } catch (err) {
        clearAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  // Gọi sau khi login thành công
  const handleLoginSuccess = (authData) => {
    if (!authData?.user) {
      clearAuth();
      setUser(null);
      return;
    }

    saveAuth({ user: authData.user });
    setUser(authData.user);
  };

  // Gọi để lấy lại user mới nhất từ server
  const refreshUser = async () => {
    try {
      const res = await getMeApi();
      const freshUser = extractUser(res);

      if (!isValidUser(freshUser)) {
        clearAuth();
        setUser(null);
        return null;
      }

      setUser(freshUser);
      saveAuth({ user: freshUser });

      return freshUser;
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        clearAuth();
        setUser(null);
      }

      throw err;
    }
  };

  const handleLogout = async () => {
    await authService.logout();

    clearAuth();

    localStorage.removeItem("aitasker_expert_profile_setup_draft");
    localStorage.removeItem("aitasker_expert_profile_edit_draft");
    localStorage.removeItem("aitasker_expert_profile_correction_draft");

    sessionStorage.clear();

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
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}