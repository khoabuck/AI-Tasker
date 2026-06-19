import { Routes, Route, Navigate } from "react-router-dom";
import GuestRoute from "./GuestRoute";
import ProtectedRoute from "./ProtectedRoute";
import authService from "../../services/auth.service";

// Auth pages
import LoginPage from "../../modules/auth/pages/LoginPage";
import RegisterPage from "../../modules/auth/pages/RegisterPage";
import VerifyEmailPage from "../../modules/auth/pages/VerifyEmailPage";
import VerifyEmailNoticePage from "../../modules/auth/pages/VerifyEmailNoticePage";
import ForgotPasswordPage from "../../modules/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../../modules/auth/pages/ResetPasswordPage";
import OAuthCallbackPage from "../../modules/auth/pages/OAuthCallbackPage";
import SelectRolePage from "../../modules/auth/pages/Selectrolepage";
import SetupProfilePage from "../../modules/auth/pages/Setupprofilepage";

// Guest pages
import LandingPage from "../../modules/guest/pages/LandingPage";

// Client pages
import ClientDashboard from "../../modules/client/pages/ClientDashboard";
import PostJobPage from "../../modules/client/pages/PostJobPage";
import ProjectsPage from "../../modules/client/pages/Projectspage";
import ClientProfilePage from "../../modules/client/pages/ClientProfilePage";
import EditProfilePage from "../../modules/client/pages/EditProfilePage";
import ExpertSearchPage from "../../modules/client/pages/ExpertSearchPage";
import AIMatchingPage from "../../modules/client/pages/AIMatchingPage";
import MessagesPage from "../../modules/client/pages/MessagesPage";
import WalletPage from "../../modules/client/pages/WalletPage";
import TransactionsPage from "../../modules/client/pages/TransactionsPage";
import ClientJobDetailPage from "../../modules/client/pages/ClientJobDetailPage";
import ClientJobRecommendationPage from "../../modules/client/pages/ClientJobRecommendationPage";

// Expert pages
import ExpertDashboard from "../../modules/expert/pages/ExpertDashboard";
import ExpertProfilePage from "../../modules/expert/pages/ExpertProfilePage";
import SetupExpertProfilePage from "../../modules/expert/pages/SetupExpertProfilePage";
import EditExpertProfilePage from "../../modules/expert/pages/EditExpertProfilePage";
import UpdateExpertProfilePage from "../../modules/expert/pages/UpdateExpertProfilePage";
import BrowseJobsPage from "../../modules/expert/pages/BrowseJobsPage";
import JobDetailPage from "../../modules/expert/pages/JobDetailPage";
import SubmitProposalPage from "../../modules/expert/pages/SubmitProposalPage";
import MyProposalsPage from "../../modules/expert/pages/MyProposalsPage";
import ProposalDetailPage from "../../modules/expert/pages/ProposalDetailPage";
import ContractDetailPage from "../../modules/expert/pages/ContractDetailPage";
import MyProjectsPage from "../../modules/expert/pages/MyProjectsPage";
import ProjectDetailPage from "../../modules/expert/pages/ProjectDetailPage";
import DeliverablesPage from "../../modules/expert/pages/DeliverablesPage";
import DisputePage from "../../modules/expert/pages/DisputePage";
import ExpertMessagesPage from "../../modules/expert/pages/MessagesPage";
import RecommendedJobsPage from "../../modules/expert/pages/RecommendedJobsPage";
import ExpertWalletPage from "../../modules/expert/pages/ExpertWalletPage";
import ProjectMilestonesPage from "../../modules/expert/pages/ProjectMilestonesPage";
import MilestoneDetailPage from "../../modules/expert/pages/MilestoneDetailPage";
import DeliverableDetailPage from "../../modules/expert/pages/DeliverableDetailPage";
import MyDisputesPage from "../../modules/expert/pages/MyDisputesPage";
import DisputeDetailPage from "../../modules/expert/pages/DisputeDetailPage";
import ExpertNotificationsPage from "../../modules/expert/pages/ExpertNotificationsPage";
import ExpertReviewsPage from "../../modules/expert/pages/ExpertReviewsPage";
import ExpertSkillsPage from "../../modules/expert/pages/ExpertSkillsPage";
import ExpertProfileLockedPage from "../../modules/expert/pages/ExpertProfileLockedPage";


// Admin pages
import AdminDashboard from "../../modules/admin/pages/AdminDashboard";
import ManageDisputesPage from "../../modules/admin/pages/ManageDisputesPage";
import ManageJobsPage from "../../modules/admin/pages/ManageJobsPage";
import ManageUsersPage from "../../modules/admin/pages/ManageUsersPage";
import ManageTransactionPage from "../../modules/admin/pages/ManageTransactionsPage";
import NotFoundPage from "../../modules/error/pages/NotFoundPage";
import ManageWithdrawalsPage from "../../modules/admin/pages/ManageWithdrawalsPage";
import ManageSkillsPage from "../../modules/admin/pages/ManageSkillsPage";

const RequireAuth = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function AppRouter() {
  return (
    <Routes>
      {/* Guest only */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verify-email-notice" element={<VerifyEmailNoticePage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      {/* Onboarding */}
      <Route path="/select-role" element={<RequireAuth><SelectRolePage /></RequireAuth>} />
      <Route path="/setup-profile" element={<RequireAuth><SetupProfilePage /></RequireAuth>} />

      {/* Client */}
      <Route path="/client/dashboard" element={<RequireAuth><ClientDashboard /></RequireAuth>} />
      <Route path="/client/post-job" element={<RequireAuth><PostJobPage /></RequireAuth>} />
      <Route path="/client/projects" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
      <Route path="/client/projects/:id" element={<RequireAuth><ClientJobDetailPage /></RequireAuth>} />
      <Route path="/client/projects/:id/recommendations" element={<RequireAuth><ClientJobRecommendationPage /></RequireAuth>} />
      <Route path="/client/profile" element={<RequireAuth><ClientProfilePage /></RequireAuth>} />
      <Route path="/client/profile/edit" element={<RequireAuth><EditProfilePage /></RequireAuth>} />
      <Route path="/client/experts" element={<RequireAuth><ExpertSearchPage /></RequireAuth>} />
      <Route path="/client/ai-matching" element={<RequireAuth><AIMatchingPage /></RequireAuth>} />
      <Route path="/client/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
      <Route path="/client/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />
      <Route path="/client/transactions" element={<RequireAuth><TransactionsPage /></RequireAuth>} />

      {/* Expert */}
      <Route path="/expert" element={<ProtectedRoute allowedRoles={["EXPERT"]}><Navigate to="/expert/dashboard" replace /></ProtectedRoute>} />
      <Route path="/expert/dashboard" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertDashboard /></ProtectedRoute>} />

      <Route path="/expert/profile" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/setup-profile" element={<ProtectedRoute allowedRoles={["EXPERT"]}><SetupExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/edit" element={<ProtectedRoute allowedRoles={["EXPERT"]}><EditExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/update" element={<ProtectedRoute allowedRoles={["EXPERT"]}><UpdateExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/update-basic" element={<ProtectedRoute allowedRoles={["EXPERT"]}><UpdateExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/update-verification" element={<ProtectedRoute allowedRoles={["EXPERT"]}><UpdateExpertProfilePage /></ProtectedRoute>} />

      <Route path="/expert/jobs" element={<ProtectedRoute allowedRoles={["EXPERT"]}><BrowseJobsPage /></ProtectedRoute>} />
      <Route path="/expert/jobs/:jobId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><JobDetailPage /></ProtectedRoute>} />
      <Route path="/expert/jobs/:jobId/proposal" element={<ProtectedRoute allowedRoles={["EXPERT"]}><SubmitProposalPage /></ProtectedRoute>} />
      <Route path="/expert/recommended-jobs" element={<ProtectedRoute allowedRoles={["EXPERT"]}><RecommendedJobsPage /></ProtectedRoute>} />

      <Route path="/expert/proposals" element={<ProtectedRoute allowedRoles={["EXPERT"]}><MyProposalsPage /></ProtectedRoute>} />
      <Route path="/expert/proposals/:proposalId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ProposalDetailPage /></ProtectedRoute>} />
      <Route path="/expert/proposals/:proposalId/contract" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ContractDetailPage /></ProtectedRoute>} />
      <Route path="/expert/contracts/:contractId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ContractDetailPage /></ProtectedRoute>} />

      <Route path="/expert/projects" element={<ProtectedRoute allowedRoles={["EXPERT"]}><MyProjectsPage /></ProtectedRoute>} />
      <Route path="/expert/projects/:projectId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ProjectDetailPage /></ProtectedRoute>} />
      <Route path="/expert/projects/:projectId/milestones" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ProjectMilestonesPage /></ProtectedRoute>} />
      <Route path="/expert/projects/:projectId/deliverables" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DeliverablesPage /></ProtectedRoute>} />
      <Route path="/expert/projects/:projectId/dispute" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DisputePage /></ProtectedRoute>} />

      <Route path="/expert/notifications" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertNotificationsPage /></ProtectedRoute>} />
      <Route path="/expert/messages" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertMessagesPage /></ProtectedRoute>} />
      <Route path="/expert/wallet" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertWalletPage /></ProtectedRoute>} />

      <Route path="/expert/milestones/:milestoneId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><MilestoneDetailPage /></ProtectedRoute>} />
      <Route path="/expert/milestones/:milestoneId/deliverables" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DeliverablesPage /></ProtectedRoute>} />
      <Route path="/expert/deliverables/:deliverableId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DeliverableDetailPage /></ProtectedRoute>} />
      <Route path="/expert/reviews" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertReviewsPage /></ProtectedRoute>} />
      <Route path="/expert/disputes" element={<ProtectedRoute allowedRoles={["EXPERT"]}><MyDisputesPage /></ProtectedRoute>} />
      <Route path="/expert/disputes/:disputeId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DisputeDetailPage /></ProtectedRoute>} />
      <Route path="/expert/skills" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertSkillsPage /></ProtectedRoute>} />
      <Route path="/expert/profile-locked" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertProfileLockedPage /></ProtectedRoute>} />


      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/disputes" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageDisputesPage /></ProtectedRoute>} />
      <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageJobsPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageUsersPage /></ProtectedRoute>} />
      <Route path="/admin/transactions" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Navigate to="/admin/withdrawals" replace /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageWithdrawalsPage /></ProtectedRoute>} />
      <Route path="/admin/skills" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageSkillsPage /></ProtectedRoute>} />
      
      
      
      {/* 404 */}
       <Route path="*" element={<NotFoundPage />} />
</Routes>
  );
}