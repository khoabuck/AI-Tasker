import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminService from "../../../services/admin.service";

import { compareDateDesc, formatDateTime } from "../../../utils/dateTime.utils";

// ===== Dashboard fallback data =====
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

// ===== Admin dashboard page: platform health, finance, and activity =====
export default function AdminDashboard() {
  // ===== Dashboard data state =====
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

  // ===== Derived project and activity metrics =====
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
      const key = getActivityKey(item, index);

      uniqueMap.set(key, item);
    });

    return [...uniqueMap.values()]
      .sort((a, b) => compareDateDesc(a.createdAt, b.createdAt))
      .slice(0, 5);
  }, [transactions, platformTransactions, revenue]);

  useEffect(() => {
    loadDashboard();
  }, []);

  // ===== API loading: dashboard overview sections =====
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

  // ===== Main render =====
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
              Monitor users, project flow, platform balances, escrow, disputes,
              and the latest money movement.
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
                label="Total users"
                value={formatNumber(summary.totalUsers)}
                description={`${formatNumber(
                  summary.totalClients
                )} clients · ${formatNumber(summary.totalExperts)} experts`}
                tone="cyan"
                showDescription
              />

              <SummaryCard
                icon="payments"
                label="Platform available balance"
                value={formatMoney(
                  firstNumber(
                    finance.platformAvailableBalance,
                    platformWallet.availableBalance,
                    0
                  )
                )}
                tone="green"
              />

              <SummaryCard
                icon="folder_managed"
                label="Active projects"
                value={formatNumber(projectStatusSummary.active)}
                tone="purple"
              />

              <SummaryCard
                icon="gavel"
                label="Open disputes"
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
                label="Escrow locked"
                value={formatMoney(
                  firstNumber(
                    finance.totalEscrowLocked,
                    summary.escrowLockedAmount,
                    0
                  )
                )}
                tone="purple"
              />

              <SummaryCard
                icon="pending_actions"
                label="Pending payouts"
                value={formatNumber(
                  firstNumber(
                    finance.pendingWithdrawalCount,
                    summary.pendingWithdrawalCount,
                    0
                  )
                )}
                tone="yellow"
              />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SnapshotCard
                title="Finance"
                subtitle="Revenue, escrow, and pending payout snapshot"
                icon="monitoring"
                items={[
                  {
                    label: "Total platform revenue",
                    value: formatMoney(
                      firstNumber(
                        finance.platformTotalRevenue,
                        platformWallet.totalRevenue,
                        revenue.platformFeeCollected,
                        0
                      )
                    ),
                  },
                  {
                    label: "Platform fee revenue",
                    value: formatMoney(
                      firstNumber(
                        finance.platformFeeRevenue,
                        revenue.platformFeeCollected,
                        revenue.platformFeeExpected,
                        0
                      )
                    ),
                  },
                  {
                    label: "Escrow locked",
                    value: formatMoney(
                      firstNumber(
                        finance.totalEscrowLocked,
                        summary.escrowLockedAmount,
                        0
                      )
                    ),
                  },
                  {
                    label: "Pending payouts",
                    value: formatMoney(
                      firstNumber(
                        finance.pendingWithdrawalAmount,
                        summary.pendingWithdrawalAmount,
                        0
                      )
                    ),
                  },
                ]}
              />

              <SnapshotCard
                title="Projects"
                subtitle="Project pipeline and risk status"
                icon="folder_copy"
                items={[
                  {
                    label: "Total projects",
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
                    Latest money movements, marked by how they affect platform
                    revenue, escrow, and user-held balances.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Latest {recentActivity.length} items
                  </span>

                  <Link
                    to="/admin/dashboard/recent-activity"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
                  >
                    View all activity
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <EmptyState
                  icon="receipt_long"
                  title="No recent activity"
                  description="No transaction activity returned from backend."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <div className="hidden grid-cols-[1.35fr_0.8fr_1fr_0.9fr_120px] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 md:grid">
                    <span>Activity</span>
                    <span>Impact</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span className="text-right">Date</span>
                  </div>

                  <div className="divide-y divide-white/10">
                    {recentActivity.map((item, index) => (
                      <ActivityRow
                        key={getActivityKey(item, index)}
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


// ===== Loading skeleton =====
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


// ===== Top-level dashboard metric card =====
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
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_14px_42px_rgba(0,0,0,0.24)] transition hover:border-cyan-400/20">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass[tone] || toneClass.cyan
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

// ===== Snapshot card for grouped finance/project data =====
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

// ===== Recent activity row =====
function ActivityRow({ item }) {
  const type = String(
    item.type || item.transactionType || "ACTIVITY"
  )
    .trim()
    .toUpperCase();

  const status = String(item.status || "UNKNOWN")
    .trim()
    .toUpperCase();

  const amount = Math.abs(Number(item.amount || 0));
  const impact = getMoneyImpact(item, type);

  const amountPrefix =
    impact.direction === "IN"
      ? "+"
      : impact.direction === "OUT"
        ? "-"
        : "";

  const amountClass =
    impact.direction === "IN"
      ? "text-green-300"
      : impact.direction === "OUT"
        ? "text-red-300"
        : "text-white";

  const title = getActivityTitle(item, type);

  const description = getActivityDescription(item, type, impact);

  return (
    <div className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.35fr_0.8fr_1fr_0.9fr_120px] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-bold text-white">{title}</p>

        {description && (
          <p
            className="mt-1 text-xs leading-5 text-gray-400"
            title={description}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {description}
          </p>
        )}
      </div>

      <div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${impact.className}`}
          title={impact.helpText}
        >
          {impact.label}
        </span>
      </div>

      <div className={`font-extrabold ${amountClass}`}>
        {amountPrefix}
        {formatMoney(amount)}
      </div>

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

function getActivityKey(item, index) {
  const source = String(
    item?.source || (item?.platformTransactionId ? "PLATFORM" : "USER_WALLET")
  ).toLowerCase();

  const id =
    item?.platformTransactionId ||
    item?.transactionId ||
    item?.id ||
    `${item?.type || "activity"}-${item?.createdAt || index}`;

  return `${source}-${id}`;
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

function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
}

function getMoneyImpact(item, normalizedType = "") {
  const explicitDirection = String(
    item?.direction ||
    item?.flowDirection ||
    item?.transactionDirection ||
    ""
  )
    .trim()
    .toUpperCase();

  if (["IN", "CREDIT", "INCOME", "PLUS"].includes(explicitDirection)) {
    return buildMoneyImpact("IN", "Money +", "Explicit positive money movement.");
  }

  if (["OUT", "DEBIT", "EXPENSE", "MINUS"].includes(explicitDirection)) {
    return buildMoneyImpact("OUT", "Money -", "Explicit negative money movement.");
  }

  const type = String(normalizedType || "")
    .trim()
    .toUpperCase();

  if (type.includes("ESCROW_LOCK")) {
    return buildMoneyImpact(
      "IN",
      "Escrow +",
      "Client funds were locked into escrow."
    );
  }

  if (type.includes("ESCROW_FREEZE")) {
    return buildMoneyImpact(
      "IN",
      "Frozen +",
      "Disputed funds are frozen and still held by the platform."
    );
  }

  if (type.includes("ESCROW_RELEASE")) {
    return buildMoneyImpact(
      "OUT",
      "Escrow -",
      "Locked escrow funds were released out of escrow."
    );
  }

  if (type.includes("ESCROW_RECEIVE") || type.includes("ESCROW_RECEIVED")) {
    return buildMoneyImpact(
      "OUT",
      "Escrow -",
      "Escrow funds were received by the expert."
    );
  }

  if (type.includes("PENDING_EARNING_RELEASE")) {
    return buildMoneyImpact(
      "OUT",
      "Pending -",
      "Held expert earnings became available to the expert."
    );
  }

  if (type.includes("PENDING_EARNING_REFUND")) {
    return buildMoneyImpact(
      "OUT",
      "Pending -",
      "Held expert earnings were removed because the client was refunded."
    );
  }

  if (type.includes("PENDING_EARNING_HOLD")) {
    return buildMoneyImpact(
      "IN",
      "Pending +",
      "Expert net earnings are held until project completion."
    );
  }

  if (
    type.includes("PLATFORM_FEE") ||
    type.includes("SERVICE_FEE") ||
    type.includes("WITHDRAWAL_FEE")
  ) {
    return buildMoneyImpact(
      "IN",
      "Revenue +",
      "Fee revenue was added to the platform."
    );
  }

  if (
    type.includes("DEPOSIT") ||
    type.includes("PACKAGE_PURCHASE") ||
    type.includes("JOB_CREDIT_PACKAGE_PURCHASE") ||
    type.includes("PROPOSAL_CREDIT_PACKAGE_PURCHASE")
  ) {
    return buildMoneyImpact(
      "IN",
      "Wallet +",
      "A user added money or purchased credits on the platform."
    );
  }

  if (
    type.includes("WITHDRAWAL_REJECTED") ||
    type.includes("WITHDRAWAL_EXPIRED") ||
    type.includes("WITHDRAWAL_FAILED") ||
    type.includes("PAYOUT_FAILED")
  ) {
    return buildMoneyImpact(
      "OUT",
      "Hold -",
      "Previously held withdrawal funds were released back to the user."
    );
  }

  if (type.includes("WITHDRAWAL_HOLD")) {
    return buildMoneyImpact(
      "IN",
      "Hold +",
      "User withdrawal funds were locked while payout is reviewed."
    );
  }

  if (
    type.includes("REFUND") ||
    type.includes("WITHDRAWAL_PAID") ||
    type.includes("PAYOUT") ||
    type.includes("PLATFORM_REFUND") ||
    type.includes("CLIENT_REFUND")
  ) {
    return buildMoneyImpact(
      "OUT",
      "Money -",
      "Funds left the platform balance or were returned to a user."
    );
  }

  const signedAmount = Number(item?.amount || 0);

  if (signedAmount > 0) {
    return buildMoneyImpact("IN", "Money +", "Positive wallet movement.");
  }

  if (signedAmount < 0) {
    return buildMoneyImpact("OUT", "Money -", "Negative wallet movement.");
  }

  return buildMoneyImpact("NEUTRAL", "No change", "No clear money movement.");
}

function buildMoneyImpact(direction, label, helpText) {
  const className =
    direction === "IN"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : direction === "OUT"
        ? "border-red-400/30 bg-red-400/10 text-red-300"
        : "border-white/15 bg-white/[0.04] text-gray-300";

  return {
    direction,
    label,
    helpText,
    className,
  };
}

function getActivityTitle(item, type) {
  if (type.includes("ESCROW_LOCK")) return "Client funds locked";
  if (type.includes("ESCROW_RELEASE")) return "Escrow released";
  if (type.includes("ESCROW_RECEIVE") || type.includes("ESCROW_RECEIVED")) {
    return "Expert received escrow";
  }
  if (type.includes("ESCROW_FREEZE")) return "Escrow frozen";
  if (type.includes("PENDING_EARNING_RELEASE")) return "Expert earning released";
  if (type.includes("PENDING_EARNING_HOLD")) return "Expert earning held";
  if (type.includes("PENDING_EARNING_REFUND")) return "Expert earning refunded";
  if (type.includes("EXPERT_SERVICE_FEE")) return "Expert service fee collected";
  if (type.includes("PLATFORM_FEE")) return "Platform fee collected";
  if (type.includes("WITHDRAWAL_HOLD")) return "Withdrawal funds held";
  if (type.includes("PAYOUT_PROCESSING")) return "Withdrawal payout processing";
  if (type.includes("PAYOUT_FAILED")) return "Withdrawal payout failed";
  if (type.includes("WITHDRAWAL_PAID")) return "Withdrawal paid";
  if (type.includes("WITHDRAWAL_REJECTED")) return "Withdrawal rejected";
  if (type.includes("WITHDRAWAL_EXPIRED")) return "Withdrawal expired";
  if (type.includes("WITHDRAWAL_FAILED")) return "Withdrawal failed";
  if (type.includes("REFUND")) return "Refund processed";
  if (type.includes("DEPOSIT")) return "Wallet deposit";
  if (type.includes("JOB_CREDIT_PACKAGE_PURCHASE")) {
    return "Job credit package purchased";
  }
  if (type.includes("PROPOSAL_CREDIT_PACKAGE_PURCHASE")) {
    return "Proposal credit package purchased";
  }

  return item?.displayTitle || item?.referenceDisplayName || formatLabel(type);
}

function getActivityDescription(item, type, impact) {
  const reference =
    item?.referenceDisplayName ||
    item?.projectTitle ||
    item?.milestoneTitle ||
    item?.jobTitle ||
    "";

  const suffix = reference ? ` Reference: ${reference}.` : "";

  if (type.includes("ESCROW_LOCK")) {
    return `Client money was moved from available balance into locked escrow.${suffix}`;
  }

  if (type.includes("ESCROW_RELEASE")) {
    return `Locked escrow was released, so the escrow balance goes down.${suffix}`;
  }

  if (type.includes("ESCROW_RECEIVE") || type.includes("ESCROW_RECEIVED")) {
    return `Escrow money was received by the expert, so platform-held escrow goes down.${suffix}`;
  }

  if (type.includes("PLATFORM_FEE") || type.includes("SERVICE_FEE")) {
    return `Fee income was collected by the platform.${suffix}`;
  }

  if (type.includes("DEPOSIT")) {
    return `A user topped up their wallet balance.${suffix}`;
  }

  if (type.includes("PACKAGE_PURCHASE")) {
    return `A user paid for a credit package.${suffix}`;
  }

  if (type.includes("REFUND")) {
    return `Funds were returned to the client or removed from held earnings.${suffix}`;
  }

  return (
    item?.displayDescription ||
    item?.displaySubtitle ||
    item?.description ||
    impact.helpText ||
    ""
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
