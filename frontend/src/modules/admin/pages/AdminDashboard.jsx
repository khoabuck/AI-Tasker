import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminService from "../../../services/admin.service";

const EMPTY_SUMMARY = {
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
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [revenue, setRevenue] = useState({
    totalRevenue: 0,
    platformRevenue: 0,
    escrowLocked: 0,
    payouts: 0,
    totalTransactions: 0,
    series: [],
  });
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const revenueSeries = useMemo(() => {
    if (Array.isArray(revenue)) return revenue;
    if (Array.isArray(revenue?.series)) return revenue.series;
    return [];
  }, [revenue]);

  const maxRevenue = useMemo(() => {
    if (!Array.isArray(revenueSeries) || revenueSeries.length === 0) return 0;

    return Math.max(
      ...revenueSeries.map((item) => Number(item.revenue || item.amount || 0))
    );
  }, [revenueSeries]);

  const projectStatusSummary = useMemo(() => {
    const result = {
      total: projects.length,
      active: 0,
      completed: 0,
      cancelled: 0,
      disputed: 0,
      other: 0,
    };

    projects.forEach((project) => {
      const status = String(project.status || "").toUpperCase();

      if (status === "ACTIVE" || status === "IN_PROGRESS") {
        result.active += 1;
        return;
      }

      if (status === "COMPLETED" || status === "COMPLETE" || status === "DONE") {
        result.completed += 1;
        return;
      }

      if (status === "CANCELLED" || status === "CANCELED") {
        result.cancelled += 1;
        return;
      }

      if (status === "DISPUTED" || status === "IN_DISPUTE") {
        result.disputed += 1;
        return;
      }

      result.other += 1;
    });

    return result;
  }, [projects]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.updatedAt || 0).getTime() -
          new Date(a.createdAt || a.updatedAt || 0).getTime()
      )
      .slice(0, 6);
  }, [projects]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError("");

      const [summaryResult, revenueResult, projectsResult] =
        await Promise.allSettled([
          adminService.getDashboardSummary(),
          adminService.getDashboardRevenue(),
          adminService.getDashboardProjects(),
        ]);

      if (summaryResult.status === "fulfilled") {
        setSummary({
          ...EMPTY_SUMMARY,
          ...(summaryResult.value || {}),
        });
      } else {
        console.error(
          "LOAD ADMIN DASHBOARD SUMMARY ERROR:",
          summaryResult.reason?.response?.data || summaryResult.reason
        );
      }

      if (revenueResult.status === "fulfilled") {
        setRevenue(normalizeRevenueState(revenueResult.value));
      } else {
        console.error(
          "LOAD ADMIN DASHBOARD REVENUE ERROR:",
          revenueResult.reason?.response?.data || revenueResult.reason
        );
      }

      if (projectsResult.status === "fulfilled") {
        setProjects(Array.isArray(projectsResult.value) ? projectsResult.value : []);
      } else {
        console.error(
          "LOAD ADMIN DASHBOARD PROJECTS ERROR:",
          projectsResult.reason?.response?.data || projectsResult.reason
        );
      }

      const failedSections = [
        summaryResult.status === "rejected" ? "summary" : "",
        revenueResult.status === "rejected" ? "revenue" : "",
        projectsResult.status === "rejected" ? "projects" : "",
      ].filter(Boolean);

      if (failedSections.length > 0) {
        setError(`Some dashboard sections could not be loaded: ${failedSections.join(", ")}.`);
      }
    } catch (err) {
      console.error("LOAD ADMIN DASHBOARD ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Admin Dashboard
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              System overview
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Monitor platform users, revenue, projects, disputes, transactions
              and withdrawal status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading || refreshing}
            className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-200">
            <p className="font-bold">Dashboard notice</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {loading && (
          <div className={`${cardStyle} p-12 text-center text-gray-400`}>
            <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
              hourglass_empty
            </span>
            Loading admin dashboard...
          </div>
        )}

        {!loading && (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon="groups"
                label="Total Users"
                value={formatNumber(summary.totalUsers)}
                description={`${formatNumber(summary.totalClients)} clients · ${formatNumber(summary.totalExperts)} experts`}
                tone="cyan"
              />

              <SummaryCard
                icon="payments"
                label="Total Revenue"
                value={formatMoney(getRevenueTotal(revenue, summary))}
                description={`${formatNumber(getTransactionTotal(revenue, summary))} transactions`}
                tone="green"
              />

              <SummaryCard
                icon="folder_managed"
                label="Active Projects"
                value={formatNumber(summary.activeProjects)}
                description={`${formatNumber(summary.completedProjects)} completed`}
                tone="purple"
              />

              <SummaryCard
                icon="gavel"
                label="Open Disputes"
                value={formatNumber(summary.openDisputes)}
                description="Need admin review"
                tone="yellow"
              />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard
                icon="account_balance_wallet"
                label="Pending Withdrawals"
                value={formatNumber(summary.pendingWithdrawals)}
                description="Waiting for processing"
                tone="cyan"
              />

              <SummaryCard
                icon="receipt_long"
                label="Platform Revenue"
                value={formatMoney(getPlatformRevenue(revenue, summary))}
                description="Fees earned by platform"
                tone="green"
              />

              <SummaryCard
                icon="fact_check"
                label="Project Records"
                value={formatNumber(projectStatusSummary.total)}
                description={`${formatNumber(projectStatusSummary.active)} active · ${formatNumber(projectStatusSummary.completed)} completed`}
                tone="purple"
              />
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
              <section className={`${cardStyle} p-6`}>
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Project statistics
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      Latest project records from admin dashboard API.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label="Active"
                      value={projectStatusSummary.active}
                    />

                    <StatusBadge
                      label="Completed"
                      value={projectStatusSummary.completed}
                      tone="green"
                    />

                    <StatusBadge
                      label="Disputed"
                      value={projectStatusSummary.disputed}
                      tone="yellow"
                    />

                    <StatusBadge
                      label="Cancelled"
                      value={projectStatusSummary.cancelled}
                      tone="red"
                    />
                  </div>
                </div>

                {recentProjects.length === 0 ? (
                  <EmptyState
                    icon="folder_off"
                    title="No project data"
                    description="The backend did not return project records."
                  />
                ) : (
                  <div className="space-y-4">
                    {recentProjects.map((project) => (
                      <ProjectItem
                        key={project.projectId || project.id || project.title}
                        project={project}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className={`${cardStyle} p-6`}>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Revenue overview
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      Revenue records returned from admin dashboard API.
                    </p>
                  </div>

                  <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-300">
                    {revenueSeries.length} records
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3">
                  <MiniMetric
                    label="Total Revenue"
                    value={formatMoney(getRevenueTotal(revenue, summary))}
                  />

                  <MiniMetric
                    label="Platform Revenue"
                    value={formatMoney(getPlatformRevenue(revenue, summary))}
                  />

                  <MiniMetric
                    label="Escrow Locked"
                    value={formatMoney(revenue?.escrowLocked)}
                  />
                </div>

                {revenueSeries.length === 0 ? (
                  <EmptyState
                    icon="bar_chart"
                    title="No revenue data"
                    description="The backend did not return revenue records."
                  />
                ) : (
                  <div className="space-y-4">
                    {revenueSeries.slice(0, 6).map((item, index) => {
                      const itemRevenue = Number(
                        item.revenue || item.amount || item.totalRevenue || 0
                      );

                      const percent =
                        maxRevenue > 0
                          ? Math.max((itemRevenue / maxRevenue) * 100, 4)
                          : 4;

                      return (
                        <div
                          key={`${item.label || "period"}-${index}`}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                              <p className="font-bold text-white">
                                {item.label || `Period ${index + 1}`}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {formatNumber(item.transactions || item.count || 0)} transactions
                              </p>
                            </div>

                            <p className="text-sm font-bold text-green-300">
                              {formatMoney(itemRevenue)}
                            </p>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7C3AED]"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-white">{value ?? 0}</p>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ProjectItem({ project }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getProjectStatusClass(
                project.status
              )}`}
            >
              {formatLabel(project.status)}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              Project #{project.projectId || project.id || "N/A"}
            </span>
          </div>

          <h3 className="line-clamp-1 font-bold text-white">
            {project.title || "Untitled Project"}
          </h3>

          <p className="mt-2 text-sm text-gray-400">
            Client: {project.clientName || "Client"} · Expert:{" "}
            {project.expertName || "Expert"}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            Created: {formatDate(project.createdAt)}
          </p>
        </div>

        <div className="shrink-0 text-left md:text-right">
          <p className="text-xl font-extrabold text-white">
            {formatMoney(project.budget || project.amount)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {formatDuration(project.timelineDays)}
          </p>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ label, value, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/30 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/30 bg-red-400/10 text-red-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
        toneClass[tone] || toneClass.cyan
      }`}
    >
      {label}: {formatNumber(value)}
    </span>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        {icon}
      </span>

      <h3 className="text-lg font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function normalizeRevenueState(value) {
  if (Array.isArray(value)) {
    return {
      totalRevenue: value.reduce(
        (sum, item) => sum + Number(item?.revenue || item?.amount || 0),
        0
      ),
      platformRevenue: value.reduce(
        (sum, item) =>
          sum + Number(item?.platformFee || item?.feeAmount || 0),
        0
      ),
      totalTransactions: value.reduce(
        (sum, item) =>
          sum + Number(item?.transactions || item?.count || 0),
        0
      ),
      series: value,
    };
  }

  return {
    totalRevenue: Number(value?.totalRevenue || value?.revenue || 0),
    platformRevenue: Number(value?.platformRevenue || value?.platformFees || 0),
    escrowLocked: Number(value?.escrowLocked || value?.lockedAmount || 0),
    payouts: Number(value?.payouts || value?.expertPayouts || 0),
    totalTransactions: Number(
      value?.totalTransactions || value?.transactions || 0
    ),
    series: Array.isArray(value?.series)
      ? value.series
      : Array.isArray(value?.items)
      ? value.items
      : Array.isArray(value?.revenue)
      ? value.revenue
      : [],
    raw: value,
  };
}

function getRevenueTotal(revenue, summary) {
  return Number(
    revenue?.totalRevenue ||
      revenue?.revenue ||
      summary?.totalRevenue ||
      0
  );
}

function getPlatformRevenue(revenue, summary) {
  return Number(
    revenue?.platformRevenue ||
      revenue?.platformFees ||
      summary?.platformRevenue ||
      0
  );
}

function getTransactionTotal(revenue, summary) {
  return Number(
    revenue?.totalTransactions ||
      revenue?.transactions ||
      summary?.totalTransactions ||
      0
  );
}

function getProjectStatusClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "ACTIVE" || value === "IN_PROGRESS") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
  }

  if (value === "COMPLETED" || value === "COMPLETE" || value === "DONE") {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  if (value === "DISPUTED" || value === "IN_DISPUTE") {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  if (value === "CANCELLED" || value === "CANCELED") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-gray-400/30 bg-gray-400/10 text-gray-300";
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US").format(
    Number.isNaN(number) ? 0 : number
  );
}

function formatDuration(days) {
  const number = Number(days || 0);

  if (!number || number <= 0) return "Flexible";
  if (number === 1) return "1 day";

  return `${number} days`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Admin dashboard API was not found. Please check backend route.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || "Something went wrong. Please try again.";
}