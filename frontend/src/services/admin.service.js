import adminApi from "../api/admin.api";

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

  return [];
};

const normalizeSummary = (summary) => {
  if (!summary) {
    return {
      totalUsers: 0,
      totalClients: 0,
      totalExperts: 0,
      totalJobs: 0,
      openJobs: 0,
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalContracts: 0,
      openDisputes: 0,
      pendingWithdrawals: 0,
      totalRevenue: 0,
      platformRevenue: 0,
      totalTransactions: 0,
      raw: null,
    };
  }

  return {
    totalUsers: toNumber(
      getValue(summary.totalUsers, summary.TotalUsers, summary.users, 0)
    ),

    totalClients: toNumber(
      getValue(summary.totalClients, summary.TotalClients, summary.clients, 0)
    ),

    totalExperts: toNumber(
      getValue(summary.totalExperts, summary.TotalExperts, summary.experts, 0)
    ),

    totalJobs: toNumber(
      getValue(summary.totalJobs, summary.TotalJobs, summary.jobCount, 0)
    ),

    openJobs: toNumber(
      getValue(summary.openJobs, summary.OpenJobs, summary.activeJobs, 0)
    ),

    totalProjects: toNumber(
      getValue(
        summary.totalProjects,
        summary.TotalProjects,
        summary.projectCount,
        0
      )
    ),

    activeProjects: toNumber(
      getValue(
        summary.activeProjects,
        summary.ActiveProjects,
        summary.runningProjects,
        summary.RunningProjects,
        0
      )
    ),

    completedProjects: toNumber(
      getValue(
        summary.completedProjects,
        summary.CompletedProjects,
        summary.doneProjects,
        summary.DoneProjects,
        0
      )
    ),

    totalContracts: toNumber(
      getValue(
        summary.totalContracts,
        summary.TotalContracts,
        summary.contractCount,
        0
      )
    ),

    openDisputes: toNumber(
      getValue(
        summary.openDisputes,
        summary.OpenDisputes,
        summary.pendingDisputes,
        summary.PendingDisputes,
        summary.disputes,
        0
      )
    ),

    pendingWithdrawals: toNumber(
      getValue(
        summary.pendingWithdrawals,
        summary.PendingWithdrawals,
        summary.withdrawalsPending,
        summary.WithdrawalsPending,
        0
      )
    ),

    totalRevenue: toNumber(
      getValue(
        summary.totalRevenue,
        summary.TotalRevenue,
        summary.revenue,
        summary.Revenue,
        0
      )
    ),

    platformRevenue: toNumber(
      getValue(
        summary.platformRevenue,
        summary.PlatformRevenue,
        summary.platformFees,
        summary.PlatformFees,
        summary.totalPlatformFee,
        summary.TotalPlatformFee,
        0
      )
    ),

    totalTransactions: toNumber(
      getValue(
        summary.totalTransactions,
        summary.TotalTransactions,
        summary.transactions,
        summary.Transactions,
        summary.transactionCount,
        summary.TransactionCount,
        0
      )
    ),

    raw: summary,
  };
};

const normalizeRevenueItem = (item, index = 0) => {
  if (!item) return null;

  return {
    id: getValue(item.id, item.Id, index),

    label: getValue(
      item.label,
      item.Label,
      item.month,
      item.Month,
      item.date,
      item.Date,
      item.period,
      item.Period,
      item.day,
      item.Day,
      `Period ${index + 1}`
    ),

    revenue: toNumber(
      getValue(
        item.revenue,
        item.Revenue,
        item.totalRevenue,
        item.TotalRevenue,
        item.amount,
        item.Amount,
        item.grossAmount,
        item.GrossAmount,
        0
      )
    ),

    platformFee: toNumber(
      getValue(
        item.platformFee,
        item.PlatformFee,
        item.platformFees,
        item.PlatformFees,
        item.feeAmount,
        item.FeeAmount,
        0
      )
    ),

    transactions: toNumber(
      getValue(
        item.transactions,
        item.Transactions,
        item.transactionCount,
        item.TransactionCount,
        item.count,
        item.Count,
        0
      )
    ),

    raw: item,
  };
};

const normalizeRevenue = (raw) => {
  if (Array.isArray(raw)) {
    return {
      totalRevenue: raw.reduce(
        (sum, item) => sum + toNumber(item.revenue ?? item.Revenue ?? item.amount),
        0
      ),
      platformRevenue: raw.reduce(
        (sum, item) =>
          sum + toNumber(item.platformFee ?? item.PlatformFee ?? item.feeAmount),
        0
      ),
      totalTransactions: raw.reduce(
        (sum, item) =>
          sum + toNumber(item.transactions ?? item.Transactions ?? item.count),
        0
      ),
      series: raw.map(normalizeRevenueItem).filter(Boolean),
      raw,
    };
  }

  const list = Array.isArray(raw?.series)
    ? raw.series
    : Array.isArray(raw?.revenue)
    ? raw.revenue
    : Array.isArray(raw?.items)
    ? raw.items
    : [];

  return {
    totalRevenue: toNumber(
      getValue(raw?.totalRevenue, raw?.TotalRevenue, raw?.revenue, raw?.Revenue, 0)
    ),

    platformRevenue: toNumber(
      getValue(
        raw?.platformRevenue,
        raw?.PlatformRevenue,
        raw?.platformFees,
        raw?.PlatformFees,
        0
      )
    ),

    escrowLocked: toNumber(
      getValue(raw?.escrowLocked, raw?.EscrowLocked, raw?.lockedAmount, 0)
    ),

    payouts: toNumber(
      getValue(raw?.payouts, raw?.Payouts, raw?.expertPayouts, 0)
    ),

    totalTransactions: toNumber(
      getValue(
        raw?.totalTransactions,
        raw?.TotalTransactions,
        raw?.transactions,
        raw?.Transactions,
        0
      )
    ),

    series: list.map(normalizeRevenueItem).filter(Boolean),

    raw,
  };
};

const normalizeProject = (project) => {
  if (!project) return null;

  const projectId = getValue(
    project.projectId,
    project.ProjectId,
    project.id,
    project.Id
  );

  const status = String(getValue(project.status, project.Status, "ACTIVE"))
    .trim()
    .toUpperCase();

  return {
    projectId,
    id: projectId,

    title: getValue(
      project.title,
      project.Title,
      project.projectTitle,
      project.ProjectTitle,
      project.jobTitle,
      project.JobTitle,
      "Untitled Project"
    ),

    clientName: getValue(
      project.clientName,
      project.ClientName,
      project.client?.fullName,
      project.Client?.FullName,
      project.client?.name,
      project.Client?.Name,
      "Client"
    ),

    expertName: getValue(
      project.expertName,
      project.ExpertName,
      project.expert?.fullName,
      project.Expert?.FullName,
      project.expert?.name,
      project.Expert?.Name,
      "Expert"
    ),

    budget: toNumber(
      getValue(
        project.budget,
        project.Budget,
        project.totalBudget,
        project.TotalBudget,
        project.agreedPrice,
        project.AgreedPrice,
        project.totalAmount,
        project.TotalAmount,
        project.amount,
        project.Amount,
        project.finalPrice,
        project.FinalPrice,
        project.contractAmount,
        project.ContractAmount,
        0
      )
    ),

    timelineDays: toNumber(
      getValue(
        project.timelineDays,
        project.TimelineDays,
        project.durationDays,
        project.DurationDays,
        project.finalTimelineDays,
        project.FinalTimelineDays,
        0
      )
    ),

    status,

    createdAt: getValue(project.createdAt, project.CreatedAt, ""),
    updatedAt: getValue(project.updatedAt, project.UpdatedAt, ""),

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
    const raw = unwrapData(response);

    if (Array.isArray(raw)) {
      return normalizeRevenue(raw);
    }

    const list = unwrapListData(response);

    if (list.length > 0 && !raw?.totalRevenue && !raw?.platformRevenue) {
      return normalizeRevenue(list);
    }

    return normalizeRevenue(raw);
  },

  async getDashboardProjects() {
    const response = await adminApi.getDashboardProjects();
    const raw = unwrapData(response);

    if (Array.isArray(raw)) {
      return raw.map(normalizeProject).filter(Boolean);
    }

    return unwrapListData(response).map(normalizeProject).filter(Boolean);
  },

  async getDashboardOverview() {
    const [summaryResult, revenueResult, projectsResult] = await Promise.allSettled([
      this.getDashboardSummary(),
      this.getDashboardRevenue(),
      this.getDashboardProjects(),
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

      projects:
        projectsResult.status === "fulfilled" ? projectsResult.value : [],

      errors: {
        summary:
          summaryResult.status === "rejected" ? summaryResult.reason : null,
        revenue:
          revenueResult.status === "rejected" ? revenueResult.reason : null,
        projects:
          projectsResult.status === "rejected" ? projectsResult.reason : null,
      },
    };
  },
};

export default adminService;