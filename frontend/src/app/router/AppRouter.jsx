import { Routes, Route, Navigate } from "react-router-dom";
import GuestRoute from "./GuestRoute";
import authService from "../../services/auth.service";

// Auth pages
import LoginPage from "../../modules/auth/pages/LoginPage";
import RegisterPage from "../../modules/auth/pages/RegisterPage";
import VerifyEmailPage from "../../modules/auth/pages/VerifyEmailPage";
import VerifyEmailNoticePage from "../../modules/auth/pages/VerifyEmailNoticePage";
import ForgotPasswordPage from "../../modules/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../../modules/auth/pages/ResetPasswordPage";
import LandingPage from "../../modules/guest/pages/LandingPage";
import OAuthCallbackPage from "../../modules/auth/pages/OAuthCallbackPage";
import SelectRolePage from "../../modules/auth/pages/SelectRolePage";
import SetupProfilePage from "../../modules/auth/pages/SetupProfilePage";

// Client pages
import ClientDashboard from "../../modules/client/pages/ClientDashboard";
import PostJobPage from "../../modules/client/pages/PostJobPage";
import ProjectsPage from "../../modules/client/pages/ProjectsPage";
import ClientProfilePage from "../../modules/client/pages/ClientProfilePage";
import EditProfilePage from "../../modules/client/pages/EditProfilePage";
import ExpertSearchPage from "../../modules/client/pages/ExpertSearchPage";
import AIMatchingPage from "../../modules/client/pages/AIMatchingPage";
import MessagesPage from "../../modules/client/pages/MessagesPage";
import WalletPage from "../../modules/client/pages/WalletPage";
import TransactionsPage from "../../modules/client/pages/TransactionsPage";
import ClientJobDetailPage from "../../modules/client/pages/ClientJobDetailPage";
import ClientJobRecommendationPage from "../../modules/client/pages/ClientJobRecommendationPage";
import EditJobPage from "../../modules/client/pages/EditJobPage";
import ClientProposalDetailPage from "../../modules/client/pages/ClientProposalDetailPage";
import NotificationsPage from "../../modules/client/pages/NotificationsPage";
import ClientReviewPage from "../../modules/client/pages/ClientReviewPage";

// Expert pages
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

// Admin pages
import AdminDashboard from "../../modules/admin/pages/AdminDashboard";
import ManageDisputesPage from "../../modules/admin/pages/ManageDisputesPage";
import ManageJobsPage from "../../modules/admin/pages/ManageJobsPage";
import ManageUsersPage from "../../modules/admin/pages/ManageUsersPage";

// ── Bảo vệ route — redirect về /login nếu chưa đăng nhập ──
const RequireAuth = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function AppRouter() {
  return (
    <Routes>

      {/* ── Guest only — chặn user đã login ── */}
      <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register"        element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

      {/* ── Public — không cần đăng nhập ── */}
      <Route path="/"                     element={<LandingPage />} />
      <Route path="/reset-password"       element={<ResetPasswordPage />} />
      <Route path="/verify-email"         element={<VerifyEmailPage />} />
      <Route path="/verify-email-notice"  element={<VerifyEmailNoticePage />} />
      <Route path="/oauth/callback"       element={<OAuthCallbackPage />} />

      {/* ── Onboarding — cần đăng nhập ── */}
      <Route path="/select-role"    element={<RequireAuth><SelectRolePage /></RequireAuth>} />
      <Route path="/setup-profile"  element={<RequireAuth><SetupProfilePage /></RequireAuth>} />

      {/* ── Client routes ── */}
      <Route path="/client/dashboard"    element={<RequireAuth><ClientDashboard /></RequireAuth>} />
      <Route path="/client/post-job"     element={<RequireAuth><PostJobPage /></RequireAuth>} />
      <Route path="/client/projects"     element={<RequireAuth><ProjectsPage /></RequireAuth>} />
      <Route path="/client/profile"      element={<RequireAuth><ClientProfilePage /></RequireAuth>} />
      <Route path="/client/profile/edit" element={<RequireAuth><EditProfilePage /></RequireAuth>} />
      <Route path="/client/experts"      element={<RequireAuth><ExpertSearchPage /></RequireAuth>} />
      <Route path="/client/ai-matching"  element={<RequireAuth><AIMatchingPage /></RequireAuth>} />
      <Route path="/client/messages"     element={<RequireAuth><MessagesPage /></RequireAuth>} />
      <Route path="/client/wallet"       element={<RequireAuth><WalletPage /></RequireAuth>} />
      <Route path="/client/transactions" element={<RequireAuth><TransactionsPage /></RequireAuth>} />
      <Route path="/client/projects/:id" element={<RequireAuth><ClientJobDetailPage /></RequireAuth>} />
      <Route path="/client/projects/:id/recommendations" element={<RequireAuth><ClientJobRecommendationPage /></RequireAuth>} />
      <Route path="/client/jobs/:id/edit" element={ <RequireAuth> <EditJobPage /> </RequireAuth>} />
      <Route path="/client/proposals/:proposalId" element={<RequireAuth><ClientProposalDetailPage /></RequireAuth>} />
      <Route path="/client/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
      <Route path="/client/projects/:id/review" element={<RequireAuth><ClientReviewPage /></RequireAuth>} />

      {/* ── Expert routes ── */}
      <Route path="/expert"                                        element={<RequireAuth><ExpertDashboard /></RequireAuth>} />
      <Route path="/expert/dashboard"                              element={<RequireAuth><ExpertDashboard /></RequireAuth>} />
      <Route path="/expert/profile"                                element={<RequireAuth><ExpertProfilePage /></RequireAuth>} />
      <Route path="/expert/jobs"                                   element={<RequireAuth><BrowseJobsPage /></RequireAuth>} />
      <Route path="/expert/jobs/:jobId"                            element={<RequireAuth><JobDetailPage /></RequireAuth>} />
      <Route path="/expert/jobs/:jobId/proposal"                   element={<RequireAuth><SubmitProposalPage /></RequireAuth>} />
      <Route path="/expert/proposals"                              element={<RequireAuth><MyProposalsPage /></RequireAuth>} />
      <Route path="/expert/projects"                               element={<RequireAuth><MyProjectsPage /></RequireAuth>} />
      <Route path="/expert/projects/:projectId"                    element={<RequireAuth><ProjectDetailPage /></RequireAuth>} />
      <Route path="/expert/projects/:projectId/deliverables"       element={<RequireAuth><DeliverablesPage /></RequireAuth>} />
      <Route path="/expert/projects/:projectId/dispute"            element={<RequireAuth><DisputePage /></RequireAuth>} />
      <Route path="/expert/messages"                               element={<RequireAuth><ExpertMessagesPage /></RequireAuth>} />
      <Route path="/expert/recommended-jobs"                       element={<RequireAuth><RecommendedJobsPage /></RequireAuth>} />
      <Route path="/expert/wallet"                                 element={<RequireAuth><ExpertWalletPage /></RequireAuth>} />
      <Route path="/expert/projects/:projectId/milestones"         element={<RequireAuth><ProjectMilestonesPage /></RequireAuth>} />

      {/* ── Admin routes ── */}
      <Route path="/admin"            element={<RequireAuth><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/dashboard"  element={<RequireAuth><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/disputes"   element={<RequireAuth><ManageDisputesPage /></RequireAuth>} />
      <Route path="/admin/jobs"       element={<RequireAuth><ManageJobsPage /></RequireAuth>} />
      <Route path="/admin/users"      element={<RequireAuth><ManageUsersPage /></RequireAuth>} />

      {/* ── 404 ── */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
          404 — Trang không tồn tại
        </div>
      } />

    </Routes>
  );
}