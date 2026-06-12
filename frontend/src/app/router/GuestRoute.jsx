import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Chặn user đã đăng nhập vào /login, /register
export default function GuestRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    const role = String(user?.role || "").toUpperCase();
    const status = String(user?.status || "").toUpperCase();

    if (status === "PENDING_ROLE" || !role) {
      return <Navigate to="/select-role" replace />;
    }

    if (status === "PENDING_PROFILE") {
      if (role === "EXPERT") {
        return <Navigate to="/expert/setup-profile" replace />;
      }

      if (role === "CLIENT") {
        return <Navigate to="/setup-profile" replace />;
      }

      return <Navigate to="/select-role" replace />;
    }

    if (role === "CLIENT") return <Navigate to="/client/dashboard" replace />;
    if (role === "EXPERT") return <Navigate to="/expert/dashboard" replace />;
    if (role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;

    return <Navigate to="/" replace />;
  }

  return children;
}
