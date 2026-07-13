import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import AppRouter from "./router/AppRouter";
import { clearAuth } from "../utils/auth.utils";

export default function App() {
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== "aitasker_logout_at") return;

      clearAuth();
      sessionStorage.clear();

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}