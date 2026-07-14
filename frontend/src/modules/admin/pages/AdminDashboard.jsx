import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminService from "../../../services/admin.service";

import { compareDateDesc, formatDateTime } from "../../../utils/dateTime.utils";
const EMPTY_SUMMARY = {
  totalUsers: 0,
  totalClients: 0,
  totalExperts: 0,
  totalProjects: 0,
  activeProjects: 0,
  completedProjects: 0,
  disputedProjects: 0,
  openDisputes: 0,
  resolvedDisputes: 0,
  pendingWithdrawalCount: 0,
  pendingWithdrawalAmount: 0,
  escrowLockedAmount: 0,
};

const EMPTY_REVENUE = {
  platformFeeCollected: 0,
  platformFeeExpected: 0,
  totalContractValue: 0,
  totalClientPaymentExpected: 0,
  recentTransactions: [],
};

const EMPTY_FINANCE = {
  platformAvailableBalance: 0,
  platformTotalRevenue: 0,
  platformFeeRevenue: 0,
  withdrawalFeeRevenue: 0,
  totalUserAvailableBalance: 0,
  totalExpertPendingEarningsBalance: 0,
  totalEscrowLocked: 0,
  totalEscrowFrozen: 0,
  pendingWithdrawalCount: 0,
  pendingWithdrawalAmount: 0,
};

const EMPTY_PLATFORM_WALLET = {
  walletCode: "PLATFORM",
  availableBalance: 0,
  totalRevenue: 0,
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [revenue, setRevenue] = useState(EMPTY_REVENUE);
  const [projects, setProjects] = useState([]);
  const [finance, setFinance] = useState(EMPTY_FINANCE);
  const [platformWallet, setPlatformWallet] = useState(EMPTY_PLATFORM_WALLET);
  const [transactions, setTransactions] = useState([]);
  const [platformTransactions, setPlatformTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const projectStatusSummary = useMemo(() => {
    return {
      total: summary.totalProjects || projects.length,
      active: summary.activeProjects || countByStatus(projects, ["ACTIVE"]),
      completed:
        summary.completedProjects || countByStatus(projects, ["COMPLETED"]),
      disputed: summary.disputedProjects || countByStatus(projects, ["DISPUTED"]),
    };
  }, [projects, summary]);

  const recentActivity = useMemo(() => {
    const merged = [
      ...(Array.isArray(transactions) ? transactions : []),
      ...(Array.isArray(platformTransactions) ? platformTransactions : []),
      ...(Array.isArray(revenue?.recentTransactions)
        ? revenue.recentTransactions
        : []),
    ];

    const uniqueMap = new Map();

    merged.forEach((item, index) => {
      const key =
        item.transactionId ||
        item.platformTransactionId ||
        item.id ||
        `${item.type}-${item.createdAt}-${index}`;

      uniqueMap.set(key, item);
    });

    return [...uniqueMap.values()]
      .sort((a, b) => compareDateDesc(a.createdAt, b.createdAt))
      .slice(0, 5);
  }, [transactions, platformTransactions, revenue]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError("");

      const result = await adminService.getDashboardOverview();

      setSummary({
        ...EMPTY_SUMMARY,
        ...(result.summary || {}),
      });

      setRevenue({
        ...EMPTY_REVENUE,
        ...(result.revenue || {}),
      });

      setProjects(Array.isArray(result.projects) ? result.projects : []);

      setFinance({
        ...EMPTY_FINANCE,
        ...(result.finance || {}),
      });

      setPlatformWallet({
        ...EMPTY_PLATFORM_WALLET,
        ...(result.platformWallet || {}),
      });

      setTransactions(
        Array.isArray(result.transactions) ? result.transactions : []
      );

      setPlatformTransactions(
        Array.isArray(result.platformTransactions)
          ? result.platformTransactions
          : []
      );

      const failedSections = Object.entries(result.errors || {})
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);

      if (failedSections.length > 0) {
        setError(
          `Some dashboard sections could not be loaded: ${failedSections.join(
            ", "
          )}.`
        );
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
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_14px_42px_rgba(0,0,0,0.24)]";

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
              Dashboard
            </p>

            <h1 className="text-3xl font-bold text-white md:text-3xl">
              Platform overview
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Monitor users, projects, finance, disputes, and recent activity.
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

        {loading ? (
          <PageSkeleton cards={8} admin />
        ) : (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon="groups"
                label="Total Users"
                value={formatNumber(summary.totalUsers)}
                description={`${formatNumber(
                  summary.totalClients
                )} clients · ${formatNumber(summary.totalExperts)} experts`}
                tone="cyan"
                showDescription
              />

              <SummaryCard
                icon="payments"
                label="Platform Balance"
                value={formatMoney(
                  finance.platformAvailableBalance ||
                    platformWallet.availableBalance
                )}
                tone="green"
              />

              <SummaryCard
                icon="folder_managed"
                label="Active Projects"
                value={formatNumber(projectStatusSummary.active)}
                tone="purple"
              />

              <SummaryCard
                icon="gavel"
                label="Open Disputes"
                value={formatNumber(summary.openDisputes)}
                tone="yellow"
              />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon="account_balance_wallet"
                label="User balances"
                value={formatMoney(finance.totalUserAvailableBalance)}
                tone="cyan"
              />

              <SummaryCard
                icon="savings"
                label="Pending expert earnings"
                value={formatMoney(finance.totalExpertPendingEarningsBalance)}
                tone="green"
              />

              <SummaryCard
                icon="lock"
                label="Escrow Locked"
                value={formatMoney(
                  finance.totalEscrowLocked || summary.escrowLockedAmount
                )}
                tone="purple"
              />

              <SummaryCard
                icon="pending_actions"
                label="Pending payouts"
                value={formatNumber(
                  finance.pendingWithdrawalCount ||
                    summary.pendingWithdrawalCount
                )}
                tone="yellow"
              />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SnapshotCard
                title="Finance"
                subtitle="Current financial summary"
                icon="monitoring"
                items={[
                  {
                    label: "Revenue",
                    value: formatMoney(
                      finance.platformTotalRevenue ||
                        platformWallet.totalRevenue ||
                        revenue.platformFeeCollected
                    ),
                  },
                  {
                    label: "Platform Fee",
                    value: formatMoney(
                      finance.platformFeeRevenue ||
                        revenue.platformFeeCollected ||
                        revenue.platformFeeExpected
                    ),
                  },
                  {
                    label: "Escrow Locked",
                    value: formatMoney(
                      finance.totalEscrowLocked || summary.escrowLockedAmount
                    ),
                  },
                  {
                    label: "Pending payouts",
                    value: formatMoney(
                      finance.pendingWithdrawalAmount ||
                        summary.pendingWithdrawalAmount
                    ),
                  },
                ]}
              />

              <SnapshotCard
                title="Projects"
                subtitle="Current project summary"
                icon="folder_copy"
                items={[
                  {
                    label: "Total Projects",
                    value: formatNumber(projectStatusSummary.total),
                  },
                  {
                    label: "Active",
                    value: formatNumber(projectStatusSummary.active),
                  },
                  {
                    label: "Completed",
                    value: formatNumber(projectStatusSummary.completed),
                  },
                  {
                    label: "Disputed",
                    value: formatNumber(projectStatusSummary.disputed),
                  },
                ]}
              />
            </section>

            <section className={`${cardStyle} p-6`}>
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Recent activity
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Latest financial activity.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {recentActivity.length} items
                </span>
              </div>

              {recentActivity.length === 0 ? (
                <EmptyState
                  icon="receipt_long"
                  title="No recent activity"
                  description="No transaction activity returned from backend."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <div className="hidden grid-cols-[1.4fr_1fr_1fr_120px] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 md:grid">
                    <span>Activity</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span className="text-right">Date</span>
                  </div>

                  <div className="divide-y divide-white/10">
                    {recentActivity.map((item, index) => (
                      <ActivityRow
                        key={
                          item.transactionId ||
                          item.platformTransactionId ||
                          item.id ||
                          index
                        }
                        item={item}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}


function PageSkeleton({ cards = 4, admin = false }) {
  return (
    <div className="animate-pulse px-5 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-5 w-36 rounded-full bg-white/10" />

        <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
          <div className={`h-4 w-32 rounded ${admin ? "bg-purple-400/10" : "bg-cyan-400/10"}`} />
          <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.06]" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
            />
          ))}
        </div>

        <div className="mt-6 h-80 rounded-2xl border border-white/10 bg-[#151a22]" />
      </div>
    </div>
  );
}


function SummaryCard({
  icon,
  label,
  value,
  description,
  tone = "cyan",
  showDescription = false,
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-3 text-2xl font-bold text-white md:text-3xl">
        {value ?? 0}
      </p>

      {showDescription && description && (
        <p className="mt-2 text-sm text-gray-400">{description}</p>
      )}
    </div>
  );
}

function SnapshotCard({ title, subtitle, icon, items }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <span className="text-sm text-gray-400">{item.label}</span>
            <span className="text-sm font-extrabold text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ item }) {
  const type = item.type || item.transactionType || "ACTIVITY";
  const status = item.status || "UNKNOWN";

  return (
    <div className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.4fr_1fr_1fr_120px] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-bold text-white">{formatLabel(type)}</p>
        {item.description && (
          <p className="mt-1 truncate text-xs text-gray-500">
            {item.description}
          </p>
        )}
      </div>

      <div className="font-bold text-white">{formatMoney(item.amount)}</div>

      <div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${getStatusClass(
            status
          )}`}
        >
          {formatLabel(status)}
        </span>
      </div>

      <div className="text-left text-xs text-gray-400 md:text-right">
        {formatDate(item.createdAt)}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        {icon}
      </span>

      <h3 className="text-base font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function countByStatus(items, statuses) {
  const statusSet = new Set(statuses.map((item) => String(item).toUpperCase()));

  return items.filter((item) =>
    statusSet.has(String(item.status || "").toUpperCase())
  ).length;
}

function getStatusClass(status) {
  const value = String(status || "").toUpperCase();

  if (
    value === "ACTIVE" ||
    value === "IN_PROGRESS" ||
    value === "SUCCESS" ||
    value === "SUCCEEDED" ||
    value === "PAID" ||
    value === "COMPLETED" ||
    value === "RELEASED"
  ) {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  if (
    value === "PENDING" ||
    value === "PENDING_ESCROW" ||
    value === "SUBMITTED" ||
    value === "LOCKED" ||
    value === "FROZEN"
  ) {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  if (
    value === "DISPUTED" ||
    value === "IN_DISPUTE" ||
    value === "FAILED" ||
    value === "REJECTED" ||
    value === "CANCELLED" ||
    value === "CANCELED" ||
    value === "REFUNDED"
  ) {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isNaN(number) ? 0 : number
  );
}

function formatDate(value) {
  return formatDateTime(value, "N/A");
};


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