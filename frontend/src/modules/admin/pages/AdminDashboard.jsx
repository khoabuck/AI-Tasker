import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminService from "../../../services/admin.service";

export default function AdminDashboard() {
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalExperts: 0,
    openDisputes: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    pendingWithdrawals: 0,
  });

  const [revenue, setRevenue] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const maxRevenue = useMemo(() => {
    if (!Array.isArray(revenue) || revenue.length === 0) return 0;

    return Math.max(...revenue.map((item) => Number(item.revenue || 0)));
  }, [revenue]);

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

      if (status === "COMPLETED" || status === "DONE") {
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
    return [...projects].slice(0, 6);
  }, [projects]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryData, revenueData, projectsData] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getDashboardRevenue(),
        adminService.getDashboardProjects(),
      ]);

      setSummary(summaryData);
      setRevenue(Array.isArray(revenueData) ? revenueData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      console.error("LOAD ADMIN DASHBOARD ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Dashboard
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                System overview
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Monitor platform users, revenue, projects, disputes,
                transactions and withdrawal status.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              <p className="font-bold">Dashboard error</p>
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
              {/* Summary */}
              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  icon="groups"
                  label="Total Users"
                  value={summary.totalUsers}
                  description={`${summary.totalClients} clients · ${summary.totalExperts} experts`}
                  tone="cyan"
                />

                <SummaryCard
                  icon="payments"
                  label="Total Revenue"
                  value={formatMoney(summary.totalRevenue)}
                  description={`${summary.totalTransactions} transactions`}
                  tone="green"
                />

                <SummaryCard
                  icon="folder_managed"
                  label="Active Projects"
                  value={summary.activeProjects}
                  description={`${summary.completedProjects} completed`}
                  tone="purple"
                />

                <SummaryCard
                  icon="gavel"
                  label="Open Disputes"
                  value={summary.openDisputes}
                  description="Need admin review"
                  tone="yellow"
                />
              </section>

              <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryCard
                  icon="account_balance_wallet"
                  label="Pending Withdrawals"
                  value={summary.pendingWithdrawals}
                  description="Waiting for processing"
                  tone="cyan"
                />

                <SummaryCard
                  icon="receipt_long"
                  label="Transactions"
                  value={summary.totalTransactions}
                  description="Total payment records"
                  tone="green"
                />

                <SummaryCard
                  icon="fact_check"
                  label="Project Records"
                  value={projectStatusSummary.total}
                  description={`${projectStatusSummary.active} active · ${projectStatusSummary.completed} completed`}
                  tone="purple"
                />
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
                {/* Projects */}
                <section className={`${cardStyle} p-6`}>
                  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Project statistics
                      </h2>

                      <p className="mt-1 text-sm text-gray-400">
                        Projects returned from admin dashboard projects API.
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
                          key={project.projectId || project.id}
                          project={project}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Revenue */}
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
                      {revenue.length} records
                    </span>
                  </div>

                  {revenue.length === 0 ? (
                    <EmptyState
                      icon="bar_chart"
                      title="No revenue data"
                      description="The backend did not return revenue records."
                    />
                  ) : (
                    <div className="space-y-4">
                      {revenue.slice(0, 6).map((item, index) => {
                        const percent =
                          maxRevenue > 0
                            ? Math.max(
                                (Number(item.revenue || 0) / maxRevenue) *
                                  100,
                                4
                              )
                            : 4;

                        return (
                          <div
                            key={`${item.label}-${index}`}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                          >
                            <div className="mb-3 flex items-center justify-between gap-4">
                              <div>
                                <p className="font-bold text-white">
                                  {item.label || `Period ${index + 1}`}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {item.transactions || 0} transactions
                                </p>
                              </div>

                              <p className="text-sm font-bold text-green-300">
                                {formatMoney(item.revenue)}
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

function ProjectItem({ project }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
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

          <h3 className="font-bold text-white">
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

        <p className="text-xl font-extrabold text-white">
          {formatMoney(project.budget)}
        </p>
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
      {label}: {value}
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

function getProjectStatusClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "ACTIVE" || value === "IN_PROGRESS") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
  }

  if (value === "COMPLETED" || value === "DONE") {
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

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || "Something went wrong. Please try again.";
}