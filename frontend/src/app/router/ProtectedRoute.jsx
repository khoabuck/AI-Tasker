import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Chỉ cho vào nếu đã đăng nhập và đúng role
// allowedRoles: ["CLIENT"] | ["EXPERT"] | ["ADMIN"] | bỏ trống = mọi role
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Đang tải...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = String(user?.role || "").toUpperCase();
  const status = String(user?.status || "").toUpperCase();

  if (status === "PENDING_ROLE") {
    return <Navigate to="/select-role" replace />;
  }

  if (status === "PENDING_PROFILE") {
    const isClientSetupPage = location.pathname === "/setup-profile";

    const isExpertSetupPage =
      location.pathname === "/expert/setup-profile" ||
      location.pathname === "/expert/profile/edit";

    if (role === "EXPERT" && !isExpertSetupPage) {
      return <Navigate to="/expert/setup-profile" replace />;
    }

    if (role === "CLIENT" && !isClientSetupPage) {
      return <Navigate to="/setup-profile" replace />;
    }

    if (role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  if (
    allowedRoles &&
    !allowedRoles.map((item) => String(item).toUpperCase()).includes(role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}