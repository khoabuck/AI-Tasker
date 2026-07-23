import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminService from "../../../services/admin.service";
import { compareDateDesc, formatDateTime } from "../../../utils/dateTime.utils";

const ACTIVITY_TAKE_LIMIT = 200;

const SOURCE_FILTERS = [
  { value: "ALL", label: "All sources" },
  { value: "PLATFORM", label: "Platform" },
  { value: "USER_WALLET", label: "User wallet" },
];

const IMPACT_FILTERS = [
  { value: "ALL", label: "All impacts" },
  { value: "IN", label: "Money +" },
  { value: "OUT", label: "Money -" },
  { value: "REVENUE", label: "Revenue +" },
  { value: "ESCROW", label: "Escrow" },
  { value: "WALLET", label: "Wallet" },
  { value: "PENDING", label: "Pending" },
  { value: "HOLD", label: "Hold" },
];

export default function AdminRecentActivityPage() {
  const [transactions, setTransactions] = useState([]);
  const [platformTransactions, setPlatformTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [impactFilter, setImpactFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const activities = useMemo(() => {
    return buildActivityList(transactions, platformTransactions);
  }, [transactions, platformTransactions]);

  const filteredActivities = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return activities.filter((item) => {
      const type = normalizeType(item);
      const impact = getMoneyImpact(item, type);
      const source = String(item.source || "USER_WALLET").toUpperCase();

      if (sourceFilter !== "ALL" && source !== sourceFilter) {
        return false;
      }

      if (impactFilter !== "ALL" && !matchesImpactFilter(impact, impactFilter)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        getActivityTitle(item, type),
        getActivityDescription(item, type, impact),
        type,
        item.status,
        item.source,
        item.referenceDisplayName,
        item.projectTitle,
        item.milestoneTitle,
        item.jobTitle,
        item.userId,
        item.transactionId,
        item.platformTransactionId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [activities, impactFilter, search, sourceFilter]);

  const totals = useMemo(() => {
    return filteredActivities.reduce(
      (acc, item) => {
        const type = normalizeType(item);
        const impact = getMoneyImpact(item, type);
        const amount = Math.abs(Number(item.amount || 0));

        if (impact.direction === "IN") {
          acc.inAmount += amount;
          acc.inCount += 1;
        } else if (impact.direction === "OUT") {
          acc.outAmount += amount;
          acc.outCount += 1;
        } else {
          acc.neutralCount += 1;
        }

        if (impact.label.includes("Revenue")) {
          acc.revenueAmount += amount;
        }

        return acc;
      },
      {
        inAmount: 0,
        outAmount: 0,
        revenueAmount: 0,
        inCount: 0,
        outCount: 0,
        neutralCount: 0,
      }
    );
  }, [filteredActivities]);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError("");

      const [userResult, platformResult] = await Promise.allSettled([
        adminService.getDashboardTransactions({ take: ACTIVITY_TAKE_LIMIT }),
        adminService.getPlatformTransactions({ take: ACTIVITY_TAKE_LIMIT }),
      ]);

      if (userResult.status === "fulfilled") {
        setTransactions(Array.isArray(userResult.value) ? userResult.value : []);
      } else {
        setTransactions([]);
      }

      if (platformResult.status === "fulfilled") {
        setPlatformTransactions(
          Array.isArray(platformResult.value) ? platformResult.value : []
        );
      } else {
        setPlatformTransactions([]);
      }

      const failedSections = [
        userResult.status === "rejected" ? "user wallet transactions" : "",
        platformResult.status === "rejected" ? "platform transactions" : "",
      ].filter(Boolean);

      if (failedSections.length > 0) {
        setError(
          `Some recent activity could not be loaded: ${failedSections.join(
            ", "
          )}.`
        );
      }
    } catch (err) {
      console.error("LOAD ADMIN RECENT ACTIVITY ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/admin/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
            >
              <span className="material-symbols-outlined text-base">
                arrow_back
              </span>
              Back to dashboard
            </Link>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
              Money activity
            </p>

            <h1 className="text-3xl font-bold text-white">
              Full recent activity
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Review platform, escrow, wallet, package purchase, fee, refund,
              and withdrawal movements with clear money impact.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRecentActivity}
            disabled={loading || refreshing}
            className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-200">
            <p className="font-bold">Recent activity notice</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {loading ? (
          <PageSkeleton />
        ) : (
          <>
            <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                label="Money in"
                value={formatMoney(totals.inAmount)}
                description={`${formatNumber(totals.inCount)} positive movements`}
                tone="green"
              />

              <MetricCard
                label="Money out"
                value={formatMoney(totals.outAmount)}
                description={`${formatNumber(totals.outCount)} negative movements`}
                tone="red"
              />

              <MetricCard
                label="Revenue impact"
                value={formatMoney(totals.revenueAmount)}
                description="Platform fee and service fee income"
                tone="cyan"
              />
            </section>

            <section className="mb-5 rounded-2xl border border-white/10 bg-[#151a22]/95 p-4 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Search activity
                  </label>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search type, status, project, job, user, transaction..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
                  />
                </div>

                <SelectFilter
                  label="Source"
                  value={sourceFilter}
                  options={SOURCE_FILTERS}
                  onChange={setSourceFilter}
                />

                <SelectFilter
                  label="Impact"
                  value={impactFilter}
                  options={IMPACT_FILTERS}
                  onChange={setImpactFilter}
                />

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSourceFilter("ALL");
                    setImpactFilter("ALL");
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  Clear filters
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                  Showing {formatNumber(filteredActivities.length)} of{" "}
                  {formatNumber(activities.length)} activities
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                  Loaded up to {formatNumber(ACTIVITY_TAKE_LIMIT)} items per source
                </span>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
              {filteredActivities.length === 0 ? (
                <EmptyState
                  icon="receipt_long"
                  title="No activity found"
                  description="Try clearing filters or refreshing the dashboard activity."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <div className="hidden grid-cols-[130px_1.35fr_0.75fr_1fr_0.9fr_140px] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 lg:grid">
                    <span>Source</span>
                    <span>Activity</span>
                    <span>Impact</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span className="text-right">Date</span>
                  </div>

                  <div className="divide-y divide-white/10">
                    {filteredActivities.map((item, index) => (
                      <FullActivityRow
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

function FullActivityRow({ item }) {
  const type = normalizeType(item);
  const status = String(item.status || "UNKNOWN").trim().toUpperCase();
  const amount = Math.abs(Number(item.amount || 0));
  const impact = getMoneyImpact(item, type);
  const title = getActivityTitle(item, type);
  const description = getActivityDescription(item, type, impact);
  const source = String(item.source || "USER_WALLET").toUpperCase();

  const amountPrefix =
    impact.direction === "IN" ? "+" : impact.direction === "OUT" ? "-" : "";

  const amountClass =
    impact.direction === "IN"
      ? "text-green-300"
      : impact.direction === "OUT"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[130px_1.35fr_0.75fr_1fr_0.9fr_140px] lg:items-center">
      <div>
        <span className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase text-cyan-300">
          {source === "PLATFORM" ? "Platform" : "User wallet"}
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate font-bold text-white">{title}</p>

        {description && (
          <p className="mt-1 text-xs leading-5 text-gray-400">
            {description}
          </p>
        )}

        <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-600">
          {formatLabel(type)}
        </p>
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

      <div className="text-left text-xs text-gray-400 lg:text-right">
        {formatDate(item.createdAt)}
      </div>
    </div>
  );
}

function MetricCard({ label, value, description, tone }) {
  const toneClass = {
    green: "text-green-300",
    red: "text-red-300",
    cyan: "text-cyan-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-3 text-2xl font-black ${toneClass[tone]}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#151a22]">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
          />
        ))}
      </div>

      <div className="mb-5 h-28 rounded-2xl border border-white/10 bg-[#151a22]" />
      <div className="h-[480px] rounded-2xl border border-white/10 bg-[#151a22]" />
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

function buildActivityList(userTransactions, platformTransactions) {
  const uniqueMap = new Map();

  [
    ...(Array.isArray(userTransactions) ? userTransactions : []),
    ...(Array.isArray(platformTransactions) ? platformTransactions : []),
  ].forEach((item, index) => {
    uniqueMap.set(getActivityKey(item, index), item);
  });

  return [...uniqueMap.values()].sort((a, b) =>
    compareDateDesc(a.createdAt, b.createdAt)
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

function normalizeType(item) {
  return String(item?.type || item?.transactionType || "ACTIVITY")
    .trim()
    .toUpperCase();
}

function matchesImpactFilter(impact, filter) {
  if (filter === "IN" || filter === "OUT") {
    return impact.direction === filter;
  }

  return impact.label.toUpperCase().includes(filter);
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

  const type = String(normalizedType || "").trim().toUpperCase();

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
    return "Admin recent activity API was not found. Please check backend route.";
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
