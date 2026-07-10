import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function GuestRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1116] text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  // Logic của Minh: nếu chưa login hoặc chưa có user thì cho vào guest page
  if (!isAuthenticated || !user) {
    return children;
  }

  // Chuẩn hóa role/status để tránh lỗi viết hoa viết thường
  const role = String(user?.role || "").trim().toUpperCase();
  const status = String(user?.status || "").trim().toUpperCase();

  // Nếu chưa xác minh email
  if (status === "PENDING_EMAIL_VERIFICATION") {
    return (
      <Navigate
        to="/verify-email-notice"
        state={{ email: user?.email }}
        replace
      />
    );
  }

  // Nếu chưa chọn role
  if (status === "PENDING_ROLE" || !role) {
    return <Navigate to="/select-role" replace />;
  }

  // Nếu chưa setup profile
  if (status === "PENDING_PROFILE") {
    // Logic của Huy: Expert đi setup expert profile
    if (role === "EXPERT") {
      return <Navigate to="/expert/setup-profile" replace />;
    }

    // Logic của Minh + Huy: Client đi setup client profile
    if (role === "CLIENT") {
      return <Navigate to="/setup-profile" replace />;
    }

    return <Navigate to="/select-role" replace />;
  }

  // Nếu expert profile đang bị locked
  if (role === "EXPERT" && status === "EXPERT_PROFILE_LOCKED") {
    return <Navigate to="/expert/profile-locked" replace />;
  }

  // Nếu đã active thì redirect theo role
  if (status === "ACTIVE") {
    if (role === "CLIENT") return <Navigate to="/client/dashboard" replace />;
    if (role === "EXPERT") return <Navigate to="/expert/dashboard" replace />;
    if (role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  }

  

  return <Navigate to="/" replace />;
}