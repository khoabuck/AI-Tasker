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

  const role = String(user?.role || "").trim().toUpperCase();
  const status = String(user?.status || "").trim().toUpperCase();
  const pathname = location.pathname;

  const isClientSetupPage = pathname === "/setup-profile";

  const isExpertProfileReviewPage =
    pathname === "/expert/setup-profile" ||
    pathname === "/expert/profile/edit" ||
    pathname === "/expert/profile-locked";

  const isExpertLockedPage = pathname === "/expert/profile-locked";

  if (status === "PENDING_ROLE") {
    return <Navigate to="/select-role" replace />;
  }

  // Quan trọng: vẫn cho /expert/profile/edit đi qua khi userStatus đang LOCKED.
  // Lý do: khi lockUntil đã hết hạn, SetupExpertProfilePage sẽ gọi backend,
  // backend reset lock khi resubmit, và user có thể gửi lại hồ sơ.
  if (role === "EXPERT" && status === "EXPERT_PROFILE_LOCKED") {
    if (!isExpertProfileReviewPage) {
      return <Navigate to="/expert/profile-locked" replace />;
    }

    return children;
  }

  if (status === "PENDING_PROFILE") {
    if (role === "EXPERT" && !isExpertProfileReviewPage) {
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
