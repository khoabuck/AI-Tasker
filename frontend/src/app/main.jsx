// src/app/main.jsx
// Wrap toàn bộ app bằng GoogleOAuthProvider để dùng Google Login ở bất kỳ đâu

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "../styles/index.css";
import App from "./App";

// ⚠️ Thay bằng Client ID của bạn
const GOOGLE_CLIENT_ID = "791444585697-1navgehlqua12ikrbitnjcker1er8haq.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);