<<<<<<< HEAD
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmailApi } from "../../../api/auth.api";
import { getErrorMessage } from "../../../utils/auth.utils";

// Route: /verify-email?token=xxx
// Gọi khi user click link trong email
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Link xác thực không hợp lệ.");
      return;
    }
    const doVerify = async () => {
      try {
        const data = await verifyEmailApi(token);
        setStatus("success");
        setMessage(data.message || "Email đã được xác thực thành công.");
      } catch (err) {
        setStatus("error");
        setMessage(getErrorMessage(err));
      }
    };
    doVerify();
  }, [token]);
=======
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// Route hiện tại:
// /verify-email?success=true&message=...
// BE đã verify xong rồi redirect về FE
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const successParam = searchParams.get("success");
  const messageParam = searchParams.get("message");

  const isSuccess = successParam === "true";

  const message =
    messageParam ||
    (isSuccess
      ? "Email đã được xác thực thành công. Bạn có thể đăng nhập."
      : "Link xác thực không hợp lệ.");
>>>>>>> origin/fe/minh

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
<<<<<<< HEAD
        {status === "loading" && (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500 text-sm">Đang xác thực email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Xác thực thành công!</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
=======
        {isSuccess ? (
          <>
            <div className="text-5xl mb-4">✅</div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Xác thực thành công!
            </h2>

            <p className="text-gray-500 text-sm mb-6">
              {message}
            </p>

>>>>>>> origin/fe/minh
            <button
              onClick={() => navigate("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-2.5 text-sm transition"
            >
              Đăng nhập ngay
            </button>
          </>
<<<<<<< HEAD
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Xác thực thất bại</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link to="/verify-email-notice" className="text-sm text-blue-600 hover:underline">
=======
        ) : (
          <>
            <div className="text-5xl mb-4">❌</div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Xác thực thất bại
            </h2>

            <p className="text-gray-500 text-sm mb-6">
              {message}
            </p>

            <Link
              to="/verify-email-notice"
              className="text-sm text-blue-600 hover:underline"
            >
>>>>>>> origin/fe/minh
              Gửi lại email xác thực
            </Link>
          </>
        )}
      </div>
    </div>
  );
}