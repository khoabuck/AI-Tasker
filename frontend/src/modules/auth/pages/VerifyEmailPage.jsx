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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        {isSuccess ? (
          <>
            <div className="text-5xl mb-4">✅</div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Xác thực thành công!
            </h2>

            <p className="text-gray-500 text-sm mb-6">
              {message}
            </p>

            <button
              onClick={() => navigate("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-2.5 text-sm transition"
            >
              Đăng nhập ngay
            </button>
          </>
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
              Gửi lại email xác thực
            </Link>
          </>
        )}
      </div>
    </div>
  );
}