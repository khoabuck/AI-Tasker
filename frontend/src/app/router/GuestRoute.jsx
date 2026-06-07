import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Chặn user đã đăng nhập vào /login, /register
export default function GuestRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    if (user?.status === "PENDING_ROLE") return <Navigate to="/select-role" replace />;
    if (user?.status === "PENDING_PROFILE") return <Navigate to="/setup-profile" replace />;
    if (user?.role === "CLIENT") return <Navigate to="/client/dashboard" replace />;
    if (user?.role === "EXPERT") return <Navigate to="/expert/dashboard" replace />;
    if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}