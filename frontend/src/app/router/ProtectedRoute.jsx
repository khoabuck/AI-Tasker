import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Chỉ cho vào nếu đã đăng nhập và đúng role
// allowedRoles: ["CLIENT"] | ["EXPERT"] | ["ADMIN"] | bỏ trống = mọi role
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Đang tải...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.status === "PENDING_ROLE") return <Navigate to="/select-role" replace />;
  if (user?.status === "PENDING_PROFILE") return <Navigate to="/setup-profile" replace />;

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}