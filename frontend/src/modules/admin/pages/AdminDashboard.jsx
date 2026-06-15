import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminService from "../../../services/admin.service";

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const latestProjects = useMemo(() => {
    return [...projects].slice(0, 6);
  }, [projects]);

  const latestRevenue = useMemo(() => {
    return [...revenue].slice(0, 6);
  }, [revenue]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryData, revenueData, projectData] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getDashboardRevenue(),
        adminService.getDashboardProjects(),
      ]);

      setSummary(summaryData);
      setRevenue(revenueData);
      setProjects(projectData);
    } catch (err) {
      console.error("LOAD ADMIN DASHBOARD ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load admin dashboard."));
      setSummary(null);
      setRevenue([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Workspace
              </p>

              <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                Manage AI Tasker system
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
                Monitor dashboard metrics, revenue, active projects, disputes
                and pending business verifications.
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
          </section>

          {error && <Alert title="Dashboard error" message={error} />}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center text-gray-400">
              Loading admin dashboard...
            </div>
          ) : (
            <>
              <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  icon="groups"
                  label="Total Users"
                  value={summary?.totalUsers}
                  description={`${summary?.totalClients || 0} clients · ${
                    summary?.totalExperts || 0
                  } experts`}
                  tone="cyan"
                />

                <SummaryCard
                  icon="business_center"
                  label="Pending Business"
                  value={summary?.pendingBusinessVerifications}
                  description="Business profiles need review"
                  tone="yellow"
                />

                <SummaryCard
                  icon="gavel"
                  label="Open Disputes"
                  value={summary?.openDisputes}
                  description="Need admin resolution"
                  tone="red"
                />

                <SummaryCard
                  icon="folder_open"
                  label="Active Projects"
                  value={summary?.activeProjects}
                  description={`${summary?.completedProjects || 0} completed`}
                  tone="green"
                />

                <SummaryCard
                  icon="payments"
                  label="Total Revenue"
                  value={formatMoney(summary?.totalRevenue)}
                  description="Platform revenue"
                  tone="green"
                />

                <SummaryCard
                  icon="receipt_long"
                  label="Transactions"
                  value={summary?.totalTransactions}
                  description="Total payment records"
                  tone="cyan"
                />

                <SummaryCard
                  icon="account_balance"
                  label="Pending Withdrawals"
                  value={summary?.pendingWithdrawals}
                  description="Withdrawal requests pending"
                  tone="yellow"
                />

                <SummaryCard
                  icon="verified_user"
                  label="Admin Actions"
                  value="3"
                  description="Dashboard · Disputes · Verifications"
                  tone="red"
                />
              </section>

              <section className="mb-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Admin API alignment
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-cyan-100/80">
                      Dashboard now uses Swagger endpoints:
                      /admin/dashboard/summary, /admin/dashboard/revenue and
                      /admin/dashboard/projects.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/admin/disputes"
                      className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
                    >
                      Manage Disputes
                    </Link>

                    <Link
                      to="/admin/business-verifications"
                      className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
                    >
                      Business Verification
                    </Link>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
                <main className="space-y-6">
                  <Card title="Dashboard Projects">
                    {latestProjects.length === 0 ? (
                      <EmptyState
                        icon="folder_off"
                        title="No projects returned"
                        description="Backend did not return project dashboard data."
                      />
                    ) : (
                      <div className="space-y-4">
                        {latestProjects.map((project) => (
                          <ProjectItem
                            key={project.projectId}
                            project={project}
                          />
                        ))}
                      </div>
                    )}
                  </Card>
                </main>

                <aside className="space-y-6">
                  <Card title="Revenue Overview">
                    {latestRevenue.length === 0 ? (
                      <EmptyState
                        icon="monitoring"
                        title="No revenue data"
                        description="Backend did not return revenue data."
                      />
                    ) : (
                      <div className="space-y-4">
                        {latestRevenue.map((item, index) => (
                          <RevenueItem key={`${item.label}-${index}`} item={item} />
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card title="Admin Modules">
                    <div className="space-y-3">
                      <ModuleLink
                        to="/admin/disputes"
                        icon="gavel"
                        title="Disputes"
                        desc="Review and resolve project disputes."
                      />

                      <ModuleLink
                        to="/admin/business-verifications"
                        icon="business_center"
                        title="Business Verifications"
                        desc="Approve or reject pending business clients."
                      />

                      <ModuleLink
                        to="/admin/dashboard"
                        icon="dashboard"
                        title="Dashboard"
                        desc="View system overview and revenue metrics."
                      />
                    </div>
                  </Card>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon, label, value, description, tone }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)] transition hover:border-cyan-400/40">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-white">
        {value ?? 0}
      </p>

      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <h2 className="mb-5 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function ProjectItem({ project }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              Project #{project.projectId}
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

function RevenueItem({ item }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-white">{item.label}</p>
          <p className="mt-1 text-xs text-gray-500">
            {item.transactions || 0} transactions
          </p>
        </div>

        <p className="text-lg font-extrabold text-green-300">
          {formatMoney(item.revenue)}
        </p>
      </div>
    </article>
  );
}

function ModuleLink({ to, icon, title, desc }) {
  return (
    <Link
      to={to}
      className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <div>
        <p className="font-bold text-white">{title}</p>
        <p className="mt-1 text-sm leading-5 text-gray-400">{desc}</p>
      </div>
    </Link>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "ACTIVE").toUpperCase();

  const style =
    value === "COMPLETED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "CANCELLED" || value === "DISPUTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {value}
    </span>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        {icon}
      </span>

      <h3 className="font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function Alert({ title, message }) {
  return (
    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function formatMoney(value) {
  const number = Number(value || 0);

  return `$${number.toLocaleString("en-US")}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data ||
    err?.message ||
    fallback
  );
}