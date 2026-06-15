import adminApi from "../api/admin.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
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

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.projects)) return data.data.projects;
  if (Array.isArray(data?.data?.revenue)) return data.data.revenue;

  return [];
};

const normalizeSummary = (summary) => {
  if (!summary) {
    return {
      totalUsers: 0,
      totalClients: 0,
      totalExperts: 0,
      pendingBusinessVerifications: 0,
      openDisputes: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      pendingWithdrawals: 0,
    };
  }

  return {
    totalUsers: Number(
      getValue(summary.totalUsers, summary.TotalUsers, summary.users, 0)
    ),

    totalClients: Number(
      getValue(summary.totalClients, summary.TotalClients, summary.clients, 0)
    ),

    totalExperts: Number(
      getValue(summary.totalExperts, summary.TotalExperts, summary.experts, 0)
    ),

    pendingBusinessVerifications: Number(
      getValue(
        summary.pendingBusinessVerifications,
        summary.PendingBusinessVerifications,
        summary.pendingBusinesses,
        summary.PendingBusinesses,
        summary.pendingVerifications,
        summary.PendingVerifications,
        0
      )
    ),

    openDisputes: Number(
      getValue(
        summary.openDisputes,
        summary.OpenDisputes,
        summary.pendingDisputes,
        summary.PendingDisputes,
        summary.disputes,
        0
      )
    ),

    activeProjects: Number(
      getValue(
        summary.activeProjects,
        summary.ActiveProjects,
        summary.runningProjects,
        summary.RunningProjects,
        0
      )
    ),

    completedProjects: Number(
      getValue(
        summary.completedProjects,
        summary.CompletedProjects,
        summary.doneProjects,
        summary.DoneProjects,
        0
      )
    ),

    totalRevenue: Number(
      getValue(
        summary.totalRevenue,
        summary.TotalRevenue,
        summary.revenue,
        summary.Revenue,
        0
      )
    ),

    totalTransactions: Number(
      getValue(
        summary.totalTransactions,
        summary.TotalTransactions,
        summary.transactions,
        summary.Transactions,
        0
      )
    ),

    pendingWithdrawals: Number(
      getValue(
        summary.pendingWithdrawals,
        summary.PendingWithdrawals,
        summary.withdrawalsPending,
        summary.WithdrawalsPending,
        0
      )
    ),

    raw: summary,
  };
};

const normalizeRevenueItem = (item) => {
  if (!item) return null;

  return {
    label: getValue(
      item.label,
      item.Label,
      item.month,
      item.Month,
      item.date,
      item.Date,
      item.period,
      item.Period,
      "Period"
    ),

    revenue: Number(
      getValue(
        item.revenue,
        item.Revenue,
        item.totalRevenue,
        item.TotalRevenue,
        item.amount,
        item.Amount,
        0
      )
    ),

    transactions: Number(
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

    budget: Number(
      getValue(
        project.budget,
        project.Budget,
        project.totalBudget,
        project.TotalBudget,
        project.agreedPrice,
        project.AgreedPrice,
        project.totalAmount,
        project.TotalAmount,
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

    console.log("ADMIN DASHBOARD SUMMARY RESPONSE:", response?.data);

    return normalizeSummary(unwrapData(response));
  },

  async getDashboardRevenue() {
    const response = await adminApi.getDashboardRevenue();

    console.log("ADMIN DASHBOARD REVENUE RESPONSE:", response?.data);

    const raw = unwrapData(response);

    if (Array.isArray(raw)) {
      return raw.map(normalizeRevenueItem).filter(Boolean);
    }

    return unwrapListData(response).map(normalizeRevenueItem).filter(Boolean);
  },

  async getDashboardProjects() {
    const response = await adminApi.getDashboardProjects();

    console.log("ADMIN DASHBOARD PROJECTS RESPONSE:", response?.data);

    const raw = unwrapData(response);

    if (Array.isArray(raw)) {
      return raw.map(normalizeProject).filter(Boolean);
    }

    return unwrapListData(response).map(normalizeProject).filter(Boolean);
  },
};

export default adminService;