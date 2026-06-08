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
import MessagesPage from "../../modules/client/pages/MessagesPage";
import WalletPage from "../../modules/client/pages/WalletPage";
import TransactionsPage from "../../modules/client/pages/TransactionsPage";
import OAuthCallbackPage from "../../modules/auth/pages/OAuthCallbackPage";
import ExpertDashboard from "../../modules/expert/pages/ExpertDashboard";
import ExpertProfilePage from "../../modules/expert/pages/ExpertProfilePage";
import BrowseJobsPage from "../../modules/expert/pages/BrowseJobsPage";
import JobDetailPage from "../../modules/expert/pages/JobDetailPage";
import SubmitProposalPage from "../../modules/expert/pages/SubmitProposalPage";
import MyProposalsPage from "../../modules/expert/pages/MyProposalsPage";
import MyProjectsPage from "../../modules/expert/pages/MyProjectsPage";
import ProjectDetailPage from "../../modules/expert/pages/ProjectDetailPage";
import DeliverablesPage from "../../modules/expert/pages/DeliverablesPage";
import DisputePage from "../../modules/expert/pages/DisputePage";
import ExpertMessagesPage from "../../modules/expert/pages/MessagesPage";
import RecommendedJobsPage from "../../modules/expert/pages/RecommendedJobsPage";
import ExpertWalletPage from "../../modules/expert/pages/ExpertWalletPage";
import ProjectMilestonesPage from "../../modules/expert/pages/ProjectMilestonesPage";
import AdminDashboard from "../../modules/admin/pages/AdminDashboard";
import ManageDisputesPage from "../../modules/admin/pages/ManageDisputesPage";
import ManageJobsPage from "../../modules/admin/pages/ManageJobsPage";
import ManageUsersPage from "../../modules/admin/pages/ManageUsersPage";
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
        <Route path="/client/messages" element={<MessagesPage />} />
        <Route path="/client/wallet" element={<WalletPage />} />
        <Route path="/client/transactions" element={<TransactionsPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/expert" element={<ExpertDashboard />} />
        <Route path="/expert/dashboard" element={<ExpertDashboard />} />
        <Route path="/expert/profile" element={<ExpertProfilePage />} />
        <Route path="/expert/jobs" element={<BrowseJobsPage />} />
        <Route path="/expert/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/expert/jobs/:jobId/proposal" element={<SubmitProposalPage />} />
        <Route path="/expert/proposals" element={<MyProposalsPage />} />
        <Route path="/expert/projects" element={<MyProjectsPage />} />
        <Route path="/expert/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/expert/projects/:projectId/deliverables" element={<DeliverablesPage />} />
        <Route path="/expert/projects/:projectId/dispute" element={<DisputePage />} />
        <Route path="/expert/messages" element={<ExpertMessagesPage />} />
        <Route path="/expert/recommended-jobs" element={<RecommendedJobsPage />} />
        <Route path="/expert/wallet" element={<ExpertWalletPage />} />
        <Route path="/expert/projects/:projectId/milestones" element={<ProjectMilestonesPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/disputes" element={<ManageDisputesPage />} />
        <Route path="/admin/jobs" element={<ManageJobsPage />} />
        <Route path="/admin/users" element={<ManageUsersPage />} />
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