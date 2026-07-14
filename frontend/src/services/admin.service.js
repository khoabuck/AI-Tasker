import adminApi from "../api/admin.api";

import { compareDateDesc } from "../utils/dateTime.utils";
const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.summary) return data.data.summary;
  if (data?.data?.revenue) return data.data.revenue;
  if (data?.data?.projects) return data.data.projects;
  if (data?.data?.result) return data.data.result;
  if (data?.data?.item) return data.data.item;
  if (data?.data) return data.data;

  if (data?.summary) return data.summary;
  if (data?.revenue) return data.revenue;
  if (data?.projects) return data.projects;
  if (data?.result) return data.result;
  if (data?.item) return data.item;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.revenue)) return data.revenue;
  if (Array.isArray(data?.series)) return data.series;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.projects)) return data.data.projects;
  if (Array.isArray(data?.data?.revenue)) return data.data.revenue;
  if (Array.isArray(data?.data?.series)) return data.data.series;
  if (Array.isArray(data?.data?.recentTransactions)) {
    return data.data.recentTransactions;
  }

  return [];
};

const normalizeSummary = (summary) => {
  if (!summary) {
    return {
      generatedAt: "",
      totalUsers: 0,
      activeUsers: 0,
      pendingRoleUsers: 0,
      totalClients: 0,
      individualClients: 0,
      businessClients: 0,
      totalExperts: 0,
      approvedExperts: 0,
      pendingExperts: 0,
      availableExperts: 0,
      totalJobs: 0,
      openJobs: 0,
      draftJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      disputedJobs: 0,
      cancelledJobs: 0,
      totalProposals: 0,
      submittedProposals: 0,
      acceptedProposals: 0,
      rejectedProposals: 0,
      withdrawnProposals: 0,
      totalContracts: 0,
      draftContracts: 0,
      confirmedContracts: 0,
      totalProjects: 0,
      pendingEscrowProjects: 0,
      activeProjects: 0,
      disputedProjects: 0,
      completedProjects: 0,
      totalMilestones: 0,
      pendingMilestones: 0,
      fundedMilestones: 0,
      submittedMilestones: 0,
      approvedMilestones: 0,
      disputedMilestones: 0,
      totalDisputes: 0,
      openDisputes: 0,
      resolvedDisputes: 0,
      totalReviews: 0,
      totalWalletAvailableBalance: 0,
      totalWalletLockedBalance: 0,
      totalExpertPendingEarningsBalance: 0,
      totalExpertEarnings: 0,
      totalContractValue: 0,
      totalClientPaymentExpected: 0,
      platformFeeExpected: 0,
      platformFeeCollected: 0,
      escrowLockedAmount: 0,
      escrowFrozenAmount: 0,
      escrowReleasedAmount: 0,
      escrowRefundedAmount: 0,
      pendingWithdrawalCount: 0,
      pendingWithdrawalAmount: 0,
      raw: null,
    };
  }

  return {
    generatedAt: getValue(summary.generatedAt, summary.GeneratedAt, ""),

    totalUsers: toNumber(getValue(summary.totalUsers, summary.TotalUsers, 0)),
    activeUsers: toNumber(getValue(summary.activeUsers, summary.ActiveUsers, 0)),
    pendingRoleUsers: toNumber(
      getValue(summary.pendingRoleUsers, summary.PendingRoleUsers, 0)
    ),

    totalClients: toNumber(
      getValue(summary.totalClients, summary.TotalClients, 0)
    ),
    individualClients: toNumber(
      getValue(summary.individualClients, summary.IndividualClients, 0)
    ),
    businessClients: toNumber(
      getValue(summary.businessClients, summary.BusinessClients, 0)
    ),

    totalExperts: toNumber(
      getValue(summary.totalExperts, summary.TotalExperts, 0)
    ),
    approvedExperts: toNumber(
      getValue(summary.approvedExperts, summary.ApprovedExperts, 0)
    ),
    pendingExperts: toNumber(
      getValue(summary.pendingExperts, summary.PendingExperts, 0)
    ),
    availableExperts: toNumber(
      getValue(summary.availableExperts, summary.AvailableExperts, 0)
    ),

    totalJobs: toNumber(getValue(summary.totalJobs, summary.TotalJobs, 0)),
    openJobs: toNumber(getValue(summary.openJobs, summary.OpenJobs, 0)),
    draftJobs: toNumber(getValue(summary.draftJobs, summary.DraftJobs, 0)),
    activeJobs: toNumber(getValue(summary.activeJobs, summary.ActiveJobs, 0)),
    completedJobs: toNumber(
      getValue(summary.completedJobs, summary.CompletedJobs, 0)
    ),
    disputedJobs: toNumber(
      getValue(summary.disputedJobs, summary.DisputedJobs, 0)
    ),
    cancelledJobs: toNumber(
      getValue(summary.cancelledJobs, summary.CancelledJobs, 0)
    ),

    totalProposals: toNumber(
      getValue(summary.totalProposals, summary.TotalProposals, 0)
    ),
    submittedProposals: toNumber(
      getValue(summary.submittedProposals, summary.SubmittedProposals, 0)
    ),
    acceptedProposals: toNumber(
      getValue(summary.acceptedProposals, summary.AcceptedProposals, 0)
    ),
    rejectedProposals: toNumber(
      getValue(summary.rejectedProposals, summary.RejectedProposals, 0)
    ),
    withdrawnProposals: toNumber(
      getValue(summary.withdrawnProposals, summary.WithdrawnProposals, 0)
    ),

    totalContracts: toNumber(
      getValue(summary.totalContracts, summary.TotalContracts, 0)
    ),
    draftContracts: toNumber(
      getValue(summary.draftContracts, summary.DraftContracts, 0)
    ),
    confirmedContracts: toNumber(
      getValue(summary.confirmedContracts, summary.ConfirmedContracts, 0)
    ),

    totalProjects: toNumber(
      getValue(summary.totalProjects, summary.TotalProjects, 0)
    ),
    pendingEscrowProjects: toNumber(
      getValue(summary.pendingEscrowProjects, summary.PendingEscrowProjects, 0)
    ),
    activeProjects: toNumber(
      getValue(summary.activeProjects, summary.ActiveProjects, 0)
    ),
    disputedProjects: toNumber(
      getValue(summary.disputedProjects, summary.DisputedProjects, 0)
    ),
    completedProjects: toNumber(
      getValue(summary.completedProjects, summary.CompletedProjects, 0)
    ),

    totalMilestones: toNumber(
      getValue(summary.totalMilestones, summary.TotalMilestones, 0)
    ),
    pendingMilestones: toNumber(
      getValue(summary.pendingMilestones, summary.PendingMilestones, 0)
    ),
    fundedMilestones: toNumber(
      getValue(summary.fundedMilestones, summary.FundedMilestones, 0)
    ),
    submittedMilestones: toNumber(
      getValue(summary.submittedMilestones, summary.SubmittedMilestones, 0)
    ),
    approvedMilestones: toNumber(
      getValue(summary.approvedMilestones, summary.ApprovedMilestones, 0)
    ),
    disputedMilestones: toNumber(
      getValue(summary.disputedMilestones, summary.DisputedMilestones, 0)
    ),

    totalDisputes: toNumber(
      getValue(summary.totalDisputes, summary.TotalDisputes, 0)
    ),
    openDisputes: toNumber(
      getValue(summary.openDisputes, summary.OpenDisputes, 0)
    ),
    resolvedDisputes: toNumber(
      getValue(summary.resolvedDisputes, summary.ResolvedDisputes, 0)
    ),
    totalReviews: toNumber(
      getValue(summary.totalReviews, summary.TotalReviews, 0)
    ),

    totalWalletAvailableBalance: toNumber(
      getValue(
        summary.totalWalletAvailableBalance,
        summary.TotalWalletAvailableBalance,
        0
      )
    ),
    totalWalletLockedBalance: toNumber(
      getValue(
        summary.totalWalletLockedBalance,
        summary.TotalWalletLockedBalance,
        0
      )
    ),
    totalExpertPendingEarningsBalance: toNumber(
      getValue(
        summary.totalExpertPendingEarningsBalance,
        summary.TotalExpertPendingEarningsBalance,
        0
      )
    ),
    totalExpertEarnings: toNumber(
      getValue(summary.totalExpertEarnings, summary.TotalExpertEarnings, 0)
    ),
    totalContractValue: toNumber(
      getValue(summary.totalContractValue, summary.TotalContractValue, 0)
    ),
    totalClientPaymentExpected: toNumber(
      getValue(
        summary.totalClientPaymentExpected,
        summary.TotalClientPaymentExpected,
        0
      )
    ),
    platformFeeExpected: toNumber(
      getValue(summary.platformFeeExpected, summary.PlatformFeeExpected, 0)
    ),
    platformFeeCollected: toNumber(
      getValue(summary.platformFeeCollected, summary.PlatformFeeCollected, 0)
    ),
    escrowLockedAmount: toNumber(
      getValue(summary.escrowLockedAmount, summary.EscrowLockedAmount, 0)
    ),
    escrowFrozenAmount: toNumber(
      getValue(summary.escrowFrozenAmount, summary.EscrowFrozenAmount, 0)
    ),
    escrowReleasedAmount: toNumber(
      getValue(summary.escrowReleasedAmount, summary.EscrowReleasedAmount, 0)
    ),
    escrowRefundedAmount: toNumber(
      getValue(summary.escrowRefundedAmount, summary.EscrowRefundedAmount, 0)
    ),
    pendingWithdrawalCount: toNumber(
      getValue(summary.pendingWithdrawalCount, summary.PendingWithdrawalCount, 0)
    ),
    pendingWithdrawalAmount: toNumber(
      getValue(
        summary.pendingWithdrawalAmount,
        summary.PendingWithdrawalAmount,
        0
      )
    ),

    raw: summary,
  };
};

const normalizeRevenueTransaction = (item, index = 0) => {
  if (!item) return null;

  return {
    id: getValue(
      item.transactionId,
      item.TransactionId,
      item.platformTransactionId,
      item.PlatformTransactionId,
      item.id,
      item.Id,
      index
    ),
    transactionId: getValue(
      item.transactionId,
      item.TransactionId,
      item.platformTransactionId,
      item.PlatformTransactionId,
      item.id,
      item.Id,
      index
    ),
    userId: getValue(item.userId, item.UserId, ""),
    projectId: getValue(item.projectId, item.ProjectId, ""),
    milestoneId: getValue(item.milestoneId, item.MilestoneId, ""),
    escrowId: getValue(item.escrowId, item.EscrowId, ""),
    type: getValue(item.type, item.Type, "UNKNOWN"),
    amount: toNumber(getValue(item.amount, item.Amount, 0)),
    status: getValue(item.status, item.Status, "UNKNOWN"),
    description: getValue(item.description, item.Description, ""),
    referenceId: getValue(item.referenceId, item.ReferenceId, ""),
    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    raw: item,
  };
};

const normalizeRevenue = (raw) => {
  const transactions = Array.isArray(raw?.recentTransactions)
    ? raw.recentTransactions
    : Array.isArray(raw?.RecentTransactions)
    ? raw.RecentTransactions
    : [];

  return {
    generatedAt: getValue(raw?.generatedAt, raw?.GeneratedAt, ""),
    totalContractValue: toNumber(
      getValue(raw?.totalContractValue, raw?.TotalContractValue, 0)
    ),
    totalClientPaymentExpected: toNumber(
      getValue(
        raw?.totalClientPaymentExpected,
        raw?.TotalClientPaymentExpected,
        0
      )
    ),
    platformFeeExpected: toNumber(
      getValue(raw?.platformFeeExpected, raw?.PlatformFeeExpected, 0)
    ),
    platformFeeCollected: toNumber(
      getValue(raw?.platformFeeCollected, raw?.PlatformFeeCollected, 0)
    ),
    totalEscrowLocked: toNumber(
      getValue(raw?.totalEscrowLocked, raw?.TotalEscrowLocked, 0)
    ),
    totalEscrowFrozen: toNumber(
      getValue(raw?.totalEscrowFrozen, raw?.TotalEscrowFrozen, 0)
    ),
    totalEscrowReleased: toNumber(
      getValue(raw?.totalEscrowReleased, raw?.TotalEscrowReleased, 0)
    ),
    totalEscrowRefunded: toNumber(
      getValue(raw?.totalEscrowRefunded, raw?.TotalEscrowRefunded, 0)
    ),
    totalExpertPayout: toNumber(
      getValue(raw?.totalExpertPayout, raw?.TotalExpertPayout, 0)
    ),
    totalClientRefund: toNumber(
      getValue(raw?.totalClientRefund, raw?.TotalClientRefund, 0)
    ),
    pendingWithdrawalAmount: toNumber(
      getValue(raw?.pendingWithdrawalAmount, raw?.PendingWithdrawalAmount, 0)
    ),
    paidWithdrawalAmount: toNumber(
      getValue(raw?.paidWithdrawalAmount, raw?.PaidWithdrawalAmount, 0)
    ),
    recentTransactions: transactions
      .map(normalizeRevenueTransaction)
      .filter(Boolean)
      .sort((a, b) => compareDateDesc(a.createdAt, b.createdAt)),
    raw,
  };
};

const normalizeFinance = (raw) => {
  return {
    generatedAt: getValue(raw?.generatedAt, raw?.GeneratedAt, ""),
    platformAvailableBalance: toNumber(
      getValue(raw?.platformAvailableBalance, raw?.PlatformAvailableBalance, 0)
    ),
    platformTotalRevenue: toNumber(
      getValue(raw?.platformTotalRevenue, raw?.PlatformTotalRevenue, 0)
    ),
    platformFeeRevenue: toNumber(
      getValue(raw?.platformFeeRevenue, raw?.PlatformFeeRevenue, 0)
    ),
    withdrawalFeeRevenue: toNumber(
      getValue(raw?.withdrawalFeeRevenue, raw?.WithdrawalFeeRevenue, 0)
    ),
    adjustmentBalance: toNumber(
      getValue(raw?.adjustmentBalance, raw?.AdjustmentBalance, 0)
    ),
    totalUserAvailableBalance: toNumber(
      getValue(
        raw?.totalUserAvailableBalance,
        raw?.TotalUserAvailableBalance,
        0
      )
    ),
    totalUserLockedBalance: toNumber(
      getValue(raw?.totalUserLockedBalance, raw?.TotalUserLockedBalance, 0)
    ),
    totalExpertPendingEarningsBalance: toNumber(
      getValue(
        raw?.totalExpertPendingEarningsBalance,
        raw?.TotalExpertPendingEarningsBalance,
        0
      )
    ),
    totalExpertEarnings: toNumber(
      getValue(raw?.totalExpertEarnings, raw?.TotalExpertEarnings, 0)
    ),
    totalEscrowLocked: toNumber(
      getValue(raw?.totalEscrowLocked, raw?.TotalEscrowLocked, 0)
    ),
    totalEscrowFrozen: toNumber(
      getValue(raw?.totalEscrowFrozen, raw?.TotalEscrowFrozen, 0)
    ),
    totalEscrowReleased: toNumber(
      getValue(raw?.totalEscrowReleased, raw?.TotalEscrowReleased, 0)
    ),
    totalEscrowRefunded: toNumber(
      getValue(raw?.totalEscrowRefunded, raw?.TotalEscrowRefunded, 0)
    ),
    pendingWithdrawalAmount: toNumber(
      getValue(raw?.pendingWithdrawalAmount, raw?.PendingWithdrawalAmount, 0)
    ),
    pendingWithdrawalCount: toNumber(
      getValue(raw?.pendingWithdrawalCount, raw?.PendingWithdrawalCount, 0)
    ),
    paidWithdrawalAmount: toNumber(
      getValue(raw?.paidWithdrawalAmount, raw?.PaidWithdrawalAmount, 0)
    ),
    paidWithdrawalCount: toNumber(
      getValue(raw?.paidWithdrawalCount, raw?.PaidWithdrawalCount, 0)
    ),
    rejectedWithdrawalAmount: toNumber(
      getValue(raw?.rejectedWithdrawalAmount, raw?.RejectedWithdrawalAmount, 0)
    ),
    rejectedWithdrawalCount: toNumber(
      getValue(raw?.rejectedWithdrawalCount, raw?.RejectedWithdrawalCount, 0)
    ),
    failedWithdrawalAmount: toNumber(
      getValue(raw?.failedWithdrawalAmount, raw?.FailedWithdrawalAmount, 0)
    ),
    failedWithdrawalCount: toNumber(
      getValue(raw?.failedWithdrawalCount, raw?.FailedWithdrawalCount, 0)
    ),
    raw,
  };
};

const normalizePlatformWallet = (raw) => {
  return {
    platformWalletId: getValue(raw?.platformWalletId, raw?.PlatformWalletId, 0),
    walletCode: getValue(raw?.walletCode, raw?.WalletCode, "PLATFORM"),
    availableBalance: toNumber(
      getValue(raw?.availableBalance, raw?.AvailableBalance, 0)
    ),
    totalRevenue: toNumber(getValue(raw?.totalRevenue, raw?.TotalRevenue, 0)),
    platformFeeRevenue: toNumber(
      getValue(raw?.platformFeeRevenue, raw?.PlatformFeeRevenue, 0)
    ),
    withdrawalFeeRevenue: toNumber(
      getValue(raw?.withdrawalFeeRevenue, raw?.WithdrawalFeeRevenue, 0)
    ),
    adjustmentBalance: toNumber(
      getValue(raw?.adjustmentBalance, raw?.AdjustmentBalance, 0)
    ),
    createdAt: getValue(raw?.createdAt, raw?.CreatedAt, ""),
    updatedAt: getValue(raw?.updatedAt, raw?.UpdatedAt, ""),
    raw,
  };
};

const normalizePlatformTransaction = (item, index = 0) => {
  if (!item) return null;

  return {
    id: getValue(
      item.platformTransactionId,
      item.PlatformTransactionId,
      item.id,
      item.Id,
      index
    ),
    platformTransactionId: getValue(
      item.platformTransactionId,
      item.PlatformTransactionId,
      item.id,
      item.Id,
      index
    ),
    platformWalletId: getValue(item.platformWalletId, item.PlatformWalletId, ""),
    projectId: getValue(item.projectId, item.ProjectId, ""),
    contractId: getValue(item.contractId, item.ContractId, ""),
    withdrawalRequestId: getValue(
      item.withdrawalRequestId,
      item.WithdrawalRequestId,
      ""
    ),
    userId: getValue(item.userId, item.UserId, ""),
    type: getValue(item.type, item.Type, "UNKNOWN"),
    amount: toNumber(getValue(item.amount, item.Amount, 0)),
    status: getValue(item.status, item.Status, "UNKNOWN"),
    description: getValue(item.description, item.Description, ""),
    referenceId: getValue(item.referenceId, item.ReferenceId, ""),
    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    raw: item,
  };
};

const normalizeUserWallet = (item, index = 0) => {
  if (!item) return null;

  return {
    id: getValue(item.walletId, item.WalletId, index),
    walletId: getValue(item.walletId, item.WalletId, index),
    userId: getValue(item.userId, item.UserId, ""),
    email: getValue(item.email, item.Email, ""),
    fullName: getValue(item.fullName, item.FullName, "User"),
    role: getValue(item.role, item.Role, ""),
    userStatus: getValue(item.userStatus, item.UserStatus, ""),
    availableBalance: toNumber(
      getValue(item.availableBalance, item.AvailableBalance, 0)
    ),
    lockedBalance: toNumber(getValue(item.lockedBalance, item.LockedBalance, 0)),
    pendingEarningsBalance: toNumber(
      getValue(item.pendingEarningsBalance, item.PendingEarningsBalance, 0)
    ),
    withdrawableBalance: toNumber(
      getValue(item.withdrawableBalance, item.WithdrawableBalance, 0)
    ),
    totalEarning: toNumber(getValue(item.totalEarning, item.TotalEarning, 0)),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),
    raw: item,
  };
};

const normalizeEscrow = (item, index = 0) => {
  if (!item) return null;

  return {
    id: getValue(item.escrowId, item.EscrowId, index),
    escrowId: getValue(item.escrowId, item.EscrowId, index),
    projectId: getValue(item.projectId, item.ProjectId, ""),
    milestoneId: getValue(item.milestoneId, item.MilestoneId, ""),
    clientProfileId: getValue(item.clientProfileId, item.ClientProfileId, ""),
    projectTitle: getValue(item.projectTitle, item.ProjectTitle, "Project"),
    milestoneTitle: getValue(item.milestoneTitle, item.MilestoneTitle, ""),
    clientName: getValue(item.clientName, item.ClientName, "Client"),
    amount: toNumber(getValue(item.amount, item.Amount, 0)),
    status: getValue(item.status, item.Status, "UNKNOWN"),
    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),
    raw: item,
  };
};

const normalizeProject = (project) => {
  if (!project) return null;

  const projectId = getValue(project.projectId, project.ProjectId, project.id);

  return {
    projectId,
    id: projectId,
    contractId: getValue(project.contractId, project.ContractId, ""),
    proposalId: getValue(project.proposalId, project.ProposalId, ""),
    jobId: getValue(project.jobId, project.JobId, ""),

    title: getValue(
      project.projectTitle,
      project.ProjectTitle,
      project.title,
      project.Title,
      project.jobTitle,
      project.JobTitle,
      "Untitled Project"
    ),
    jobTitle: getValue(project.jobTitle, project.JobTitle, ""),
    status: getValue(
      project.projectStatus,
      project.ProjectStatus,
      project.status,
      project.Status,
      "UNKNOWN"
    ),
    contractStatus: getValue(
      project.contractStatus,
      project.ContractStatus,
      "UNKNOWN"
    ),

    clientProfileId: getValue(
      project.clientProfileId,
      project.ClientProfileId,
      ""
    ),
    clientUserId: getValue(project.clientUserId, project.ClientUserId, ""),
    clientName: getValue(project.clientName, project.ClientName, "Client"),

    expertProfileId: getValue(
      project.expertProfileId,
      project.ExpertProfileId,
      ""
    ),
    expertUserId: getValue(project.expertUserId, project.ExpertUserId, ""),
    expertName: getValue(project.expertName, project.ExpertName, "Expert"),

    projectTotalBudget: toNumber(
      getValue(project.projectTotalBudget, project.ProjectTotalBudget, 0)
    ),
    contractFinalPrice: toNumber(
      getValue(project.contractFinalPrice, project.ContractFinalPrice, 0)
    ),
    platformFeeAmount: toNumber(
      getValue(project.platformFeeAmount, project.PlatformFeeAmount, 0)
    ),
    totalClientPayment: toNumber(
      getValue(project.totalClientPayment, project.TotalClientPayment, 0)
    ),

    milestoneCount: toNumber(
      getValue(project.milestoneCount, project.MilestoneCount, 0)
    ),
    pendingMilestoneCount: toNumber(
      getValue(
        project.pendingMilestoneCount,
        project.PendingMilestoneCount,
        0
      )
    ),
    fundedMilestoneCount: toNumber(
      getValue(project.fundedMilestoneCount, project.FundedMilestoneCount, 0)
    ),
    submittedMilestoneCount: toNumber(
      getValue(
        project.submittedMilestoneCount,
        project.SubmittedMilestoneCount,
        0
      )
    ),
    approvedMilestoneCount: toNumber(
      getValue(project.approvedMilestoneCount, project.ApprovedMilestoneCount, 0)
    ),
    disputedMilestoneCount: toNumber(
      getValue(project.disputedMilestoneCount, project.DisputedMilestoneCount, 0)
    ),

    escrowLockedAmount: toNumber(
      getValue(project.escrowLockedAmount, project.EscrowLockedAmount, 0)
    ),
    escrowFrozenAmount: toNumber(
      getValue(project.escrowFrozenAmount, project.EscrowFrozenAmount, 0)
    ),
    escrowReleasedAmount: toNumber(
      getValue(project.escrowReleasedAmount, project.EscrowReleasedAmount, 0)
    ),
    escrowRefundedAmount: toNumber(
      getValue(project.escrowRefundedAmount, project.EscrowRefundedAmount, 0)
    ),

    createdAt: getValue(project.createdAt, project.CreatedAt, ""),
    startDate: getValue(project.startDate, project.StartDate, ""),
    endDate: getValue(project.endDate, project.EndDate, ""),
    raw: project,
  };
};

const adminService = {
  async getDashboardSummary() {
    const response = await adminApi.getDashboardSummary();
    return normalizeSummary(unwrapData(response));
  },

  async getDashboardRevenue() {
    const response = await adminApi.getDashboardRevenue();
    return normalizeRevenue(unwrapData(response));
  },

  async getDashboardProjects() {
    const response = await adminApi.getDashboardProjects();
    const raw = unwrapData(response);

    if (Array.isArray(raw)) {
      return raw.map(normalizeProject).filter(Boolean);
    }

    return unwrapListData(response).map(normalizeProject).filter(Boolean);
  },

  async getDashboardFinance() {
    const response = await adminApi.getDashboardFinance();
    return normalizeFinance(unwrapData(response));
  },

  async getPlatformWallet() {
    const response = await adminApi.getPlatformWallet();
    return normalizePlatformWallet(unwrapData(response));
  },

  async getPlatformTransactions(params = {}) {
    const response = await adminApi.getPlatformTransactions(params);
    return unwrapListData(response).map(normalizePlatformTransaction).filter(Boolean);
  },

  async getUserWallets(params = {}) {
    const response = await adminApi.getUserWallets(params);
    return unwrapListData(response).map(normalizeUserWallet).filter(Boolean);
  },

  async getDashboardTransactions(params = {}) {
    const response = await adminApi.getDashboardTransactions(params);
    return unwrapListData(response).map(normalizeRevenueTransaction).filter(Boolean);
  },

  async getDashboardEscrows(params = {}) {
    const response = await adminApi.getDashboardEscrows(params);
    return unwrapListData(response).map(normalizeEscrow).filter(Boolean);
  },

  async getDashboardOverview() {
    const [
      summaryResult,
      revenueResult,
      projectsResult,
      financeResult,
      platformWalletResult,
      platformTransactionsResult,
      userWalletsResult,
      transactionsResult,
      escrowsResult,
    ] = await Promise.allSettled([
      this.getDashboardSummary(),
      this.getDashboardRevenue(),
      this.getDashboardProjects(),
      this.getDashboardFinance(),
      this.getPlatformWallet(),
      this.getPlatformTransactions({ take: 6 }),
      this.getUserWallets({ take: 6 }),
      this.getDashboardTransactions({ take: 6 }),
      this.getDashboardEscrows({ take: 6 }),
    ]);

    return {
      summary:
        summaryResult.status === "fulfilled"
          ? summaryResult.value
          : normalizeSummary(null),

      revenue:
        revenueResult.status === "fulfilled"
          ? revenueResult.value
          : normalizeRevenue(null),

      projects: projectsResult.status === "fulfilled" ? projectsResult.value : [],

      finance:
        financeResult.status === "fulfilled"
          ? financeResult.value
          : normalizeFinance(null),

      platformWallet:
        platformWalletResult.status === "fulfilled"
          ? platformWalletResult.value
          : normalizePlatformWallet(null),

      platformTransactions:
        platformTransactionsResult.status === "fulfilled"
          ? platformTransactionsResult.value
          : [],

      userWallets:
        userWalletsResult.status === "fulfilled" ? userWalletsResult.value : [],

      transactions:
        transactionsResult.status === "fulfilled" ? transactionsResult.value : [],

      escrows: escrowsResult.status === "fulfilled" ? escrowsResult.value : [],

      errors: {
        summary:
          summaryResult.status === "rejected" ? summaryResult.reason : null,
        revenue:
          revenueResult.status === "rejected" ? revenueResult.reason : null,
        projects:
          projectsResult.status === "rejected" ? projectsResult.reason : null,
        finance:
          financeResult.status === "rejected" ? financeResult.reason : null,
        platformWallet:
          platformWalletResult.status === "rejected"
            ? platformWalletResult.reason
            : null,
        platformTransactions:
          platformTransactionsResult.status === "rejected"
            ? platformTransactionsResult.reason
            : null,
        userWallets:
          userWalletsResult.status === "rejected"
            ? userWalletsResult.reason
            : null,
        transactions:
          transactionsResult.status === "rejected"
            ? transactionsResult.reason
            : null,
        escrows:
          escrowsResult.status === "rejected" ? escrowsResult.reason : null,
      },
    };
  },
};

export default adminService;