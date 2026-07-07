import { createContext, useContext, useEffect, useState } from "react";
import { getMeApi } from "../api/auth.api";
import authService from "../services/auth.service";
import { saveAuth, clearAuth, getUserFromStorage } from "../utils/auth.utils";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi reload trang: gọi /auth/me để backend kiểm tra HttpOnly cookie
  useEffect(() => {
    const restore = async () => {
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
    saveAuth({ user: authData.user });
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
        const stored = getUserFromStorage();
        if (stored) setUser(stored);
      }
    }
  };

  const handleLogout = async () => {
    await authService.logout();

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
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}