import { createContext, useContext, useEffect, useState } from "react";
import { getMeApi } from "../api/auth.api";
import authService from "../services/auth.service";
import { saveAuth, clearAuth } from "../utils/auth.utils";

const AuthContext = createContext(null);

let restoreSessionPromise = null;

  const getRestoreSessionPromise = () => {
    if (!restoreSessionPromise) {
      restoreSessionPromise = getMeApi().finally(() => {
        restoreSessionPromise = null;
      });
    }

    return restoreSessionPromise;
  };

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

  // localStorage chỉ dùng làm dấu hiệu đã từng đăng nhập.
// Quyền và phiên đăng nhập thật vẫn được xác minh bằng HttpOnly cookie.
useEffect(() => {
  let isMounted = true;

  const restore = async () => {
    const storedUser = authService.getCurrentUser();

    // Chưa đăng nhập hoặc đã logout:
    // không gọi /auth/me để tránh request 401 không cần thiết.
    if (!isValidUser(storedUser)) {
      clearAuth();

      if (isMounted) {
        setUser(null);
        setLoading(false);
      }

      return;
    }

    try {
      const res = await getRestoreSessionPromise();
      const freshUser = extractUser(res);

      if (!isValidUser(freshUser)) {
        clearAuth();

        if (isMounted) {
          setUser(null);
        }

        return;
      }

      saveAuth({ user: freshUser });

      if (isMounted) {
        setUser(freshUser);
      }
    } catch (err) {
      clearAuth();

      if (isMounted) {
        setUser(null);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  restore();

  return () => {
    isMounted = false;
  };
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