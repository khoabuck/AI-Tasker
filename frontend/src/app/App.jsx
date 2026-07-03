import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import AppRouter from "./router/AppRouter";

export default function App() {
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== "activeSessionId") return;

      const currentSessionId = sessionStorage.getItem("sessionId");

      // Nếu tab này CHƯA từng tự login (sessionStorage rỗng -> currentSessionId
      // là null) thì bỏ qua, không logout. Đây chính là nguyên nhân gây lỗi:
      // trước đây thiếu dòng return này, nên bất kỳ tab thứ 2 nào mở lên
      // (chưa từng tự set sessionId trong chính tab đó) đều bị coi là
      // "phiên đã bị thay thế" và tự động bị đăng xuất ngay khi có bất kỳ
      // tab nào khác login — kể cả khi 2 tab đó không hề xung đột nhau.
      if (!currentSessionId) return;

      if (e.newValue && e.newValue !== currentSessionId) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");

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