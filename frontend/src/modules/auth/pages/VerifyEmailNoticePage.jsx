import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { resendVerificationEmailApi } from "../../../api/auth.api";
import { getErrorMessage } from "../../../utils/auth.utils";

// Route: /verify-email-notice
// Hiển thị sau khi đăng ký — hướng dẫn user check email
export default function VerifyEmailNoticePage() {
  const location = useLocation();
  const email = location.state?.email || "";

  const [status, setStatus] = useState(""); // "" | "success" | "error"
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    setStatus("");
    try {
      const data = await resendVerificationEmailApi({ email });
      setStatus("success");
      setMessage(data.message || "Email xác thực đã được gửi lại.");
    } catch (err) {
      setStatus("error");
      setMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Kiểm tra hòm thư</h2>
        <p className="text-gray-500 text-sm mb-1">Chúng tôi đã gửi link xác thực đến</p>
        {email && <p className="font-medium text-gray-800 text-sm mb-4">{email}</p>}
        <p className="text-gray-400 text-sm mb-6">
          Click vào link trong email để kích hoạt tài khoản, sau đó quay lại đăng nhập.
        </p>

        {status === "success" && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
            {message}
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {message}
          </p>
        )}

        {email && (
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? "Đang gửi..." : "Không nhận được email? Gửi lại"}
          </button>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100">
          <Link to="/login" className="text-sm text-gray-400 hover:text-gray-700">
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}