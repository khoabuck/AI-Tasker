import { Routes, Route, Navigate } from "react-router-dom";
import GuestRoute from "./GuestRoute";
import ProtectedRoute from "./ProtectedRoute";

// Auth pages
import LoginPage from "../../modules/auth/pages/LoginPage";
import RegisterPage from "../../modules/auth/pages/RegisterPage";
import VerifyEmailPage from "../../modules/auth/pages/VerifyEmailPage";
import VerifyEmailNoticePage from "../../modules/auth/pages/VerifyEmailNoticePage";
import ForgotPasswordPage from "../../modules/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../../modules/auth/pages/ResetPasswordPage";
import LandingPage from "../../modules/guest/pages/LandingPage";
import PostJobPage from "../../modules/client/pages/PostJobPage";
import ProjectsPage from "../../modules/client/pages/ProjectsPage";
import SelectRolePage from "../../modules/auth/pages/SelectRolePage";
import SetupProfilePage from "../../modules/auth/pages/SetupProfilePage";
import ClientProfilePage from "../../modules/client/pages/ClientProfilePage";
import EditProfilePage from "../../modules/client/pages/EditProfilePage";
import ExpertSearchPage from "../../modules/client/pages/ExpertSearchPage";
import AIMatchingPage from "../../modules/client/pages/AIMatchingPage";


// TODO: import khi backend làm xong
// import RoleSelectionPage from "../../modules/auth/pages/RoleSelectionPage";
// import ClientDashboard from "../../modules/client/pages/ClientDashboard";
// import ExpertDashboard from "../../modules/expert/pages/ExpertDashboard";
// import AdminDashboard from "../../modules/admin/pages/AdminDashboard";
import ClientDashboard from "../../modules/client/pages/ClientDashboard";


export default function AppRouter() {
  return (
    <Routes>
        {/* Guest only — chặn user đã login */}
        <Route path="/login"          element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register"       element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

        {/* Public — không cần đăng nhập */}
        <Route path="/reset-password"       element={<ResetPasswordPage />} />
        <Route path="/verify-email"         element={<VerifyEmailPage />} />
        <Route path="/verify-email-notice"  element={<VerifyEmailNoticePage />} />
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/post-job" element={<PostJobPage />} />
        <Route path="/client/projects" element={<ProjectsPage/>}/>
        <Route path="/select-role" element={<SelectRolePage />} />
        <Route path="/setup-profile" element={<SetupProfilePage />} />
        <Route path="/client/profile" element={<ClientProfilePage />} />
        <Route path="/client/profile/edit" element={<EditProfilePage />} />
        <Route path="/client/experts" element={<ExpertSearchPage />} />
        <Route path="/client/ai-matching" element={<AIMatchingPage />} />

        {/* Onboarding — bật khi backend xong */}
        {/* <Route path="/select-role"    element={<RoleSelectionPage />} /> */}
        {/* <Route path="/setup-profile"  element={<SetupProfilePage />} /> */}

        {/* Protected — Client */}
        {/* <Route path="/client/*" element={<ProtectedRoute allowedRoles={["CLIENT"]}><ClientLayout /></ProtectedRoute>} /> */}

        {/* Protected — Expert */}
        {/* <Route path="/expert/*" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertLayout /></ProtectedRoute>} /> */}

        {/* Protected — Admin */}
        {/* <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminLayout /></ProtectedRoute>} /> */}

        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
            404 — Trang không tồn tại
          </div>
        } />
    </Routes>
  );
}