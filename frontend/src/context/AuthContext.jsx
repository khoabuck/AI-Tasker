import { createContext, useContext, useEffect, useState } from "react";
import { getMeApi } from "../api/auth.api";
import { getAccessToken, saveAuth, clearAuth } from "../utils/auth.utils";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi reload trang: nếu có token thì gọi /auth/me để lấy user mới nhất
  useEffect(() => {
    const restore = async () => {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const freshUser = await getMeApi();
        setUser(freshUser);
        saveAuth({ user: freshUser });
      } catch {
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
    saveAuth(authData);
    setUser(authData.user);
  };

  // Gọi để lấy lại user mới nhất từ server (vd: sau select role)
  const refreshUser = async () => {
    try {
      const freshUser = await getMeApi();
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