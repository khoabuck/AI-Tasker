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
import SelectRolePage from "../../modules/auth/pages/SelectRolePage";
import SetupProfilePage from "../../modules/auth/pages/SetupProfilePage";

// Guest pages
import LandingPage from "../../modules/guest/pages/LandingPage";

// Legal
import PrivacyPolicyPage from "../../modules/legal/pages/PrivacyPolicyPage";
import TermsOfServicePage from "../../modules/legal/pages/TermsOfServicePage";
import DisputePolicyPage from "../../modules/legal/pages/DisputePolicyPage";

// Client pages
import ClientDashboard from "../../modules/client/pages/ClientDashboard";
import PostJobPage from "../../modules/client/pages/PostJobPage";
import ProjectsPage from "../../modules/client/pages/Projectspage";
import ClientProfilePage from "../../modules/client/pages/ClientProfilePage";
import EditProfilePage from "../../modules/client/pages/EditProfilePage";
import ExpertSearchPage from "../../modules/client/pages/ExpertSearchPage";
import AIMatchingPage from "../../modules/client/pages/AIMatchingPage";
import MessagesPage from "../../modules/client/pages/MessagesPage";
import WalletPage from "../../modules/wallet/WalletPage";
import TransactionsPage from "../../modules/transaction/pages/TransactionsPage";
import ClientJobDetailPage from "../../modules/client/pages/ClientJobDetailPage";
import ClientJobRecommendationPage from "../../modules/client/pages/ClientJobRecommendationPage";
import EditJobPage from "../../modules/client/pages/EditJobPage";
import ClientProposalDetailPage from "../../modules/client/pages/ClientProposalDetailPage";
import NotificationsPage from "../../modules/client/pages/NotificationsPage";
import ClientReviewPage from "../../modules/client/pages/ClientReviewPage";
import JobsPage from "../../modules/client/pages/JobsPage";
import ProjectsListPage from "../../modules/client/pages/ProjectsListPage";
import ClientProjectDetailPage from "../../modules/client/pages/ClientProjectDetailPage";
import JobCreditPackagesPage from "../../modules/client/pages/JobCreditPackagesPage";
import MilestoneDeliverablesPage from "../../modules/client/pages/MilestoneDeliverablesPage";
import ClientDisputeDetailPage from "../../modules/client/pages/ClientDisputeDetailPage";
import TransactionDetailPage from "../../modules/transaction/pages/TransactionDetailPage";
import ExpertProfileViewPage from "../../modules/client/pages/ExpertProfileViewPage";

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
import ProposalVersionsPage from "../../modules/expert/pages/ProposalVersionsPage";
import ResubmitProposalPage from "../../modules/expert/pages/ResubmitProposalPage";
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
import AdminUserDetailPage from "../../modules/admin/pages/AdminUserDetailPage";
import ManageWithdrawalsPage from "../../modules/admin/pages/ManageWithdrawalsPage";
import ManageSkillsPage from "../../modules/admin/pages/ManageSkillsPage";
import AdminAuditLogsPage from "../../modules/admin/pages/AdminAuditLogsPage";
import AdminAuditLogDetailPage from "../../modules/admin/pages/AdminAuditLogDetailPage";
import AdminExpertScoringPolicyPage from "../../modules/admin/pages/AdminExpertScoringPolicyPage";
import AdminPlatformFeePolicyPage from "../../modules/admin/pages/AdminPlatformFeePolicyPage";
<<<<<<< HEAD
import AdminJobPostingAiPolicyPage from "../../modules/admin/pages/AdminJobPostingAiPolicyPage";
import AdminJobCreditPackagesPage from "../../modules/admin/pages/AdminJobCreditPackagesPage";
=======
>>>>>>> origin/fe/minh

// Error pages
import NotFoundPage from "../../modules/error/pages/NotFoundPage";

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

      {/* Legal */}
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/dispute-policy" element={<DisputePolicyPage />} />

      {/* Client */}
      <Route path="/client/dashboard" element={<RequireAuth><ClientDashboard /></RequireAuth>} />
      <Route path="/client/post-job" element={<RequireAuth><PostJobPage /></RequireAuth>} />
      <Route path="/client/profile" element={<RequireAuth><ClientProfilePage /></RequireAuth>} />
      <Route path="/client/profile/edit" element={<RequireAuth><EditProfilePage /></RequireAuth>} />
      <Route path="/client/experts" element={<RequireAuth><ExpertSearchPage /></RequireAuth>} />
      <Route path="/client/ai-matching" element={<RequireAuth><AIMatchingPage /></RequireAuth>} />
      <Route path="/client/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
      <Route path="/client/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />
      <Route path="/client/transactions" element={<RequireAuth><TransactionsPage /></RequireAuth>} />
      <Route path="/client/job-credit-packages" element={<RequireAuth><JobCreditPackagesPage /></RequireAuth>} />
      <Route path="/client/transactions/:id" element={<RequireAuth><TransactionDetailPage /></RequireAuth>} />
      <Route path="/client/experts/:expertProfileId" element={<RequireAuth><ExpertProfileViewPage /></RequireAuth>} />

      {/* Client jobs */}
      <Route path="/client/jobs" element={<RequireAuth><JobsPage /></RequireAuth>} />
      <Route path="/client/jobs/:id" element={<RequireAuth><ClientJobDetailPage /></RequireAuth>} />
      <Route path="/client/jobs/:id/edit" element={<RequireAuth><EditJobPage /></RequireAuth>} />
      <Route path="/client/jobs/:id/recommendations" element={<RequireAuth><ClientJobRecommendationPage /></RequireAuth>} />

      {/* Client projects */}
      <Route path="/client/projects" element={<RequireAuth><ProjectsListPage /></RequireAuth>} />
      <Route path="/client/projects-old" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
      <Route path="/client/projects/:id" element={<RequireAuth><ClientProjectDetailPage /></RequireAuth>} />
      <Route path="/client/projects/:id/review" element={<RequireAuth><ClientReviewPage /></RequireAuth>} />
      <Route path="/client/milestones/:milestoneId/deliverables" element={<RequireAuth><MilestoneDeliverablesPage /></RequireAuth>} />
      <Route path="/client/disputes" element={<RequireAuth><ClientDisputeDetailPage /></RequireAuth>} />

      {/* Client proposals + notifications */}
      <Route path="/client/proposals/:proposalId" element={<RequireAuth><ClientProposalDetailPage /></RequireAuth>} />
      <Route path="/client/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />

      {/* Expert */}
      <Route path="/expert" element={<ProtectedRoute allowedRoles={["EXPERT"]}><Navigate to="/expert/dashboard" replace /></ProtectedRoute>} />
      <Route path="/expert/dashboard" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertDashboard /></ProtectedRoute>} />
      <Route path="/expert/profile" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/setup-profile" element={<ProtectedRoute allowedRoles={["EXPERT"]}><SetupExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/edit" element={<ProtectedRoute allowedRoles={["EXPERT"]}><EditExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/update" element={<ProtectedRoute allowedRoles={["EXPERT"]}><UpdateExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/update-basic" element={<ProtectedRoute allowedRoles={["EXPERT"]}><UpdateExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/update-verification" element={<ProtectedRoute allowedRoles={["EXPERT"]}><UpdateExpertProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile-locked" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertProfileLockedPage /></ProtectedRoute>} />

      {/* Expert jobs */}
      <Route path="/expert/jobs" element={<ProtectedRoute allowedRoles={["EXPERT"]}><BrowseJobsPage /></ProtectedRoute>} />
      <Route path="/expert/jobs/:jobId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><JobDetailPage /></ProtectedRoute>} />
      <Route path="/expert/jobs/:jobId/proposal" element={<ProtectedRoute allowedRoles={["EXPERT"]}><SubmitProposalPage /></ProtectedRoute>} />
      <Route path="/expert/recommended-jobs" element={<ProtectedRoute allowedRoles={["EXPERT"]}><RecommendedJobsPage /></ProtectedRoute>} />

      {/* Expert proposals */}
      <Route path="/expert/proposals" element={<ProtectedRoute allowedRoles={["EXPERT"]}><MyProposalsPage /></ProtectedRoute>} />
      <Route path="/expert/proposals/:proposalId/versions" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ProposalVersionsPage /></ProtectedRoute>} />
      <Route path="/expert/proposals/:proposalId/resubmit" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ResubmitProposalPage /></ProtectedRoute>} />
      <Route path="/expert/proposals/:proposalId/contract" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ContractDetailPage /></ProtectedRoute>} />
      <Route path="/expert/proposals/:proposalId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ProposalDetailPage /></ProtectedRoute>} />

      {/* Expert contracts */}
      <Route path="/expert/contracts/:contractId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ContractDetailPage /></ProtectedRoute>} />

      {/* Expert projects */}
      <Route path="/expert/projects" element={<ProtectedRoute allowedRoles={["EXPERT"]}><MyProjectsPage /></ProtectedRoute>} />
      <Route path="/expert/projects/:projectId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ProjectDetailPage /></ProtectedRoute>} />
      <Route path="/expert/projects/:projectId/milestones" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ProjectMilestonesPage /></ProtectedRoute>} />
      <Route path="/expert/projects/:projectId/deliverables" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DeliverablesPage /></ProtectedRoute>} />
      <Route path="/expert/projects/:projectId/dispute" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DisputePage /></ProtectedRoute>} />

      {/* Expert milestones + deliverables */}
      <Route path="/expert/milestones/:milestoneId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><MilestoneDetailPage /></ProtectedRoute>} />
      <Route path="/expert/milestones/:milestoneId/deliverables" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DeliverablesPage /></ProtectedRoute>} />
      <Route path="/expert/deliverables/:deliverableId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DeliverableDetailPage /></ProtectedRoute>} />

      {/* Expert other */}
      <Route path="/expert/notifications" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertNotificationsPage /></ProtectedRoute>} />
      <Route path="/expert/messages" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertMessagesPage /></ProtectedRoute>} />
      <Route path="/expert/wallet" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertWalletPage /></ProtectedRoute>} />
      <Route path="/expert/reviews" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertReviewsPage /></ProtectedRoute>} />
      <Route path="/expert/disputes" element={<ProtectedRoute allowedRoles={["EXPERT"]}><MyDisputesPage /></ProtectedRoute>} />
      <Route path="/expert/disputes/:disputeId" element={<ProtectedRoute allowedRoles={["EXPERT"]}><DisputeDetailPage /></ProtectedRoute>} />
      <Route path="/expert/skills" element={<ProtectedRoute allowedRoles={["EXPERT"]}><ExpertSkillsPage /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/disputes" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageDisputesPage /></ProtectedRoute>} />
      <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageJobsPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageUsersPage /></ProtectedRoute>} />
      <Route path="/admin/transactions" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Navigate to="/admin/withdrawals" replace /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageWithdrawalsPage /></ProtectedRoute>} />
      <Route path="/admin/skills" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ManageSkillsPage /></ProtectedRoute>} />
      <Route path="/admin/users/:userId" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminUserDetailPage /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminAuditLogsPage /></ProtectedRoute>} />
      <Route path="/admin/audit-logs/:auditLogId" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminAuditLogDetailPage /></ProtectedRoute>} />
      <Route path="/admin/expert-profile-scoring-policy" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminExpertScoringPolicyPage /></ProtectedRoute>} />
<<<<<<< HEAD
      <Route path="/admin/platform-fee-policy" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminPlatformFeePolicyPage /></ProtectedRoute>} />  
      <Route path="/admin/job-posting-ai-policy" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminJobPostingAiPolicyPage /></ProtectedRoute>} />
      <Route path="/admin/job-credit-packages" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminJobCreditPackagesPage /></ProtectedRoute>} /> 



=======
      <Route path="/admin/platform-fee-policy" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminPlatformFeePolicyPage /></ProtectedRoute>} />

>>>>>>> origin/fe/minh
      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}