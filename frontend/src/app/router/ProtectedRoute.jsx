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
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = String(user?.role || "").trim().toUpperCase();
  const status = String(user?.status || "").trim().toUpperCase();
  const pathname = location.pathname;

  const ROUTES = {
  CLIENT_SETUP: "/setup-profile",
  EXPERT_SETUP: "/expert/setup-profile",
  EXPERT_EDIT: "/expert/profile/edit",
  EXPERT_LOCKED: "/expert/profile-locked",
};

  const isClientSetupPage = pathname === ROUTES.CLIENT_SETUP;

  const isExpertProfileReviewPage = [
    ROUTES.EXPERT_SETUP,
    ROUTES.EXPERT_EDIT,
    ROUTES.EXPERT_LOCKED,
  ].includes(pathname);


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
    if (role === "CLIENT") {
      if (isClientSetupPage) return children;
      return <Navigate to="/setup-profile" replace />;
    }

    if (role === "EXPERT") {
      if (isExpertProfileReviewPage) return children;
      return <Navigate to="/expert/setup-profile" replace />;
    }

    if (role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  const normalizedRoles = allowedRoles?.map(r => String(r).toUpperCase());

  if (normalizedRoles?.length && !normalizedRoles.includes(role)) {
    if (role === "CLIENT") {
      return <Navigate to="/client/dashboard" replace />;
    }

    if (role === "EXPERT") {
      return <Navigate to="/expert/dashboard" replace />;
    }

    if (role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}
