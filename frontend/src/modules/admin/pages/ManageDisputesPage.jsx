import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminDisputeService from "../../../services/adminDispute.service";

const RESOLUTION_TYPES = {
  RELEASE_TO_EXPERT: "RELEASE_TO_EXPERT",
  REFUND_TO_CLIENT: "REFUND_TO_CLIENT",
  PARTIAL_SPLIT: "PARTIAL_SPLIT",
};

export default function ManageDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [formData, setFormData] = useState({
    resolutionType: RESOLUTION_TYPES.RELEASE_TO_EXPERT,
    adminDecision: "",
    expertAmount: "",
    clientAmount: "",
  });

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resolving, setResolving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await adminDisputeService.getAllDisputes();
      setDisputes(data);
    } catch (err) {
      console.error("LOAD ADMIN DISPUTES ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDisputes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return disputes.filter((dispute) => {
      const status = getStatus(dispute);
      const title = getTitle(dispute).toLowerCase();
      const projectTitle = getProjectTitle(dispute).toLowerCase();
      const reason = getReason(dispute).toLowerCase();
      const clientName = getClientName(dispute).toLowerCase();
      const expertName = getExpertName(dispute).toLowerCase();

      const matchStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const matchSearch =
        !keyword ||
        title.includes(keyword) ||
        projectTitle.includes(keyword) ||
        reason.includes(keyword) ||
        clientName.includes(keyword) ||
        expertName.includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [disputes, searchText, statusFilter]);

  const summary = useMemo(() => {
    const total = disputes.length;
    const open = disputes.filter((item) => getStatus(item) === "OPEN").length;
    const resolved = disputes.filter(
      (item) => getStatus(item) === "RESOLVED"
    ).length;
    const totalAmount = disputes.reduce(
      (sum, item) => sum + getDisputedAmount(item),
      0
    );

    return {
      total,
      open,
      resolved,
      totalAmount,
    };
  }, [disputes]);

  const resetResolveForm = (dispute) => {
    const disputedAmount = getDisputedAmount(dispute);

    setFormData({
      resolutionType: RESOLUTION_TYPES.RELEASE_TO_EXPERT,
      adminDecision: "",
      expertAmount: String(disputedAmount),
      clientAmount: "0",
    });
  };

  const handleSelectDispute = async (dispute) => {
    const disputeId = getDisputeId(dispute);

    setSelectedDispute(dispute);
    resetResolveForm(dispute);
    setMessage("");
    setError("");

    if (!disputeId) return;

    try {
      setLoadingDetail(true);

      const detail = await adminDisputeService.getDisputeById(disputeId);

      setSelectedDispute(detail);
      resetResolveForm(detail);
    } catch (err) {
      console.error("LOAD DISPUTE DETAIL ERROR:", err?.response?.data || err);

      setError(
        "Cannot load full dispute detail. Showing data from dispute list."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleResolutionTypeChange = (event) => {
    const resolutionType = event.target.value;
    const disputedAmount = getDisputedAmount(selectedDispute);

    if (resolutionType === RESOLUTION_TYPES.RELEASE_TO_EXPERT) {
      setFormData((prev) => ({
        ...prev,
        resolutionType,
        expertAmount: String(disputedAmount),
        clientAmount: "0",
      }));
      return;
    }

    if (resolutionType === RESOLUTION_TYPES.REFUND_TO_CLIENT) {
      setFormData((prev) => ({
        ...prev,
        resolutionType,
        expertAmount: "0",
        clientAmount: String(disputedAmount),
      }));
      return;
    }

    const half = Math.floor(disputedAmount / 2);
    const rest = disputedAmount - half;

    setFormData((prev) => ({
      ...prev,
      resolutionType,
      expertAmount: String(half),
      clientAmount: String(rest),
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!selectedDispute) {
      return "Please select a dispute first.";
    }

    if (getStatus(selectedDispute) !== "OPEN") {
      return "Only OPEN disputes can be resolved.";
    }

    if (!formData.resolutionType) {
      return "Resolution type is required.";
    }

    if (!formData.adminDecision.trim()) {
      return "Admin decision is required.";
    }

    if (formData.adminDecision.trim().length < 10) {
      return "Admin decision must be at least 10 characters.";
    }

    const disputedAmount = getDisputedAmount(selectedDispute);
    const expertAmount = Number(formData.expertAmount || 0);
    const clientAmount = Number(formData.clientAmount || 0);

    if (formData.resolutionType === RESOLUTION_TYPES.PARTIAL_SPLIT) {
      if (formData.expertAmount === "" || formData.clientAmount === "") {
        return "Expert amount and client amount are required for partial split.";
      }

      if (expertAmount < 0 || clientAmount < 0) {
        return "Amounts must be 0 or greater.";
      }

      if (expertAmount + clientAmount !== disputedAmount) {
        return `Expert amount plus client amount must equal disputed amount: ${formatMoney(
          disputedAmount
        )}.`;
      }
    }

    return "";
  };

  const handleResolve = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const validateError = validateForm();

    if (validateError) {
      setError(validateError);
      return;
    }

    try {
      setResolving(true);

      await adminDisputeService.resolveDispute(getDisputeId(selectedDispute), {
        ...formData,
        disputedAmount: getDisputedAmount(selectedDispute),
      });

      setMessage("Dispute resolved successfully.");
      setSelectedDispute(null);

      await loadDisputes();
    } catch (err) {
      console.error("RESOLVE DISPUTE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setResolving(false);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Disputes
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Dispute management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Review disputes between clients and experts, then decide how
                escrow money should be handled.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDisputes}
              disabled={loading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {message && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
            <SummaryCard
              icon="gavel"
              label="Total Disputes"
              value={summary.total}
              color="cyan"
            />

            <SummaryCard
              icon="warning"
              label="Open Disputes"
              value={summary.open}
              color="yellow"
            />

            <SummaryCard
              icon="task_alt"
              label="Resolved"
              value={summary.resolved}
              color="green"
            />

            <SummaryCard
              icon="payments"
              label="Disputed Amount"
              value={formatMoney(summary.totalAmount)}
              color="red"
            />
          </section>

          <section className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
              <div>
                <label className={labelStyle}>Search Dispute</label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search by title, project, reason, client, or expert..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Status</label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value="ALL">All</option>
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Showing
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredDisputes.length}
                </p>
              </div>
            </div>
          </section>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading disputes...
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_440px]">
              <section className="space-y-5">
                {filteredDisputes.length === 0 && (
                  <div className={`${cardStyle} p-12 text-center`}>
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      gavel
                    </span>

                    <h2 className="text-xl font-bold text-white">
                      No disputes found
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      There are no disputes that match your filter.
                    </p>
                  </div>
                )}

                {filteredDisputes.map((dispute) => {
                  const disputeId = getDisputeId(dispute);
                  const isSelected =
                    getDisputeId(selectedDispute || {}) === disputeId;

                  return (
                    <article
                      key={disputeId}
                      className={`${cardStyle} cursor-pointer p-6 transition ${
                        isSelected
                          ? "border-cyan-400/50"
                          : "hover:border-cyan-400/40"
                      }`}
                      onClick={() => handleSelectDispute(dispute)}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                            getStatus(dispute)
                          )}`}
                        >
                          {getStatus(dispute)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Opened {formatDate(getCreatedAt(dispute))}
                        </span>

                        <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-300">
                          {formatMoney(getDisputedAmount(dispute))}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-white">
                        {getTitle(dispute)}
                      </h2>

                      <p className="mt-2 text-sm text-cyan-300">
                        {getProjectTitle(dispute)}
                      </p>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                        {getReason(dispute) || "No reason provided."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Client: {getClientName(dispute)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Expert: {getExpertName(dispute)}
                        </span>

                        {getMilestoneTitle(dispute) && (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                            Milestone: {getMilestoneTitle(dispute)}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>

              <aside>
                <form
                  onSubmit={handleResolve}
                  className={`${cardStyle} sticky top-24 p-6`}
                >
                  {!selectedDispute && (
                    <div className="text-center">
                      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                        rule
                      </span>

                      <h2 className="text-lg font-bold text-white">
                        Select a dispute
                      </h2>

                      <p className="mt-2 text-sm text-gray-400">
                        Choose a dispute on the left to review and resolve.
                      </p>
                    </div>
                  )}

                  {selectedDispute && (
                    <>
                      <div className="mb-6 flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-white">
                            Resolve Dispute
                          </h2>

                          <p className="mt-1 text-sm text-gray-500">
                            #{getDisputeId(selectedDispute)} ·{" "}
                            {getTitle(selectedDispute)}
                          </p>
                        </div>

                        {loadingDetail && (
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                            Loading detail...
                          </span>
                        )}
                      </div>

                      <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                          Dispute Summary
                        </p>

                        <div className="space-y-2 text-sm leading-6 text-gray-300">
                          <p>
                            <span className="text-gray-500">Project:</span>{" "}
                            {getProjectTitle(selectedDispute)}
                          </p>

                          <p>
                            <span className="text-gray-500">Client:</span>{" "}
                            {getClientName(selectedDispute)}
                          </p>

                          <p>
                            <span className="text-gray-500">Expert:</span>{" "}
                            {getExpertName(selectedDispute)}
                          </p>

                          <p>
                            <span className="text-gray-500">Disputed:</span>{" "}
                            <span className="font-bold text-red-300">
                              {formatMoney(getDisputedAmount(selectedDispute))}
                            </span>
                          </p>

                          <p>
                            <span className="text-gray-500">Reason:</span>{" "}
                            {getReason(selectedDispute) || "No reason."}
                          </p>
                        </div>
                      </div>

                      <EvidenceList dispute={selectedDispute} />

                      <div className="space-y-5">
                        <div>
                          <label className={labelStyle}>Resolution Type</label>

                          <select
                            name="resolutionType"
                            value={formData.resolutionType}
                            onChange={handleResolutionTypeChange}
                            disabled={getStatus(selectedDispute) !== "OPEN"}
                            className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value={RESOLUTION_TYPES.RELEASE_TO_EXPERT}>
                              Release money to Expert
                            </option>

                            <option value={RESOLUTION_TYPES.REFUND_TO_CLIENT}>
                              Refund money to Client
                            </option>

                            <option value={RESOLUTION_TYPES.PARTIAL_SPLIT}>
                              Partial split
                            </option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className={labelStyle}>Expert Amount</label>

                            <input
                              type="number"
                              name="expertAmount"
                              value={formData.expertAmount}
                              onChange={handleChange}
                              min="0"
                              disabled={
                                formData.resolutionType !==
                                  RESOLUTION_TYPES.PARTIAL_SPLIT ||
                                getStatus(selectedDispute) !== "OPEN"
                              }
                              className={`${inputStyle} disabled:cursor-not-allowed disabled:opacity-50`}
                            />
                          </div>

                          <div>
                            <label className={labelStyle}>Client Amount</label>

                            <input
                              type="number"
                              name="clientAmount"
                              value={formData.clientAmount}
                              onChange={handleChange}
                              min="0"
                              disabled={
                                formData.resolutionType !==
                                  RESOLUTION_TYPES.PARTIAL_SPLIT ||
                                getStatus(selectedDispute) !== "OPEN"
                              }
                              className={`${inputStyle} disabled:cursor-not-allowed disabled:opacity-50`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={labelStyle}>Admin Decision</label>

                          <textarea
                            name="adminDecision"
                            value={formData.adminDecision}
                            onChange={handleChange}
                            rows="6"
                            disabled={getStatus(selectedDispute) !== "OPEN"}
                            placeholder="Explain why admin makes this decision..."
                            className={`${inputStyle} resize-none disabled:cursor-not-allowed disabled:opacity-50`}
                          />
                        </div>

                        {getStatus(selectedDispute) !== "OPEN" && (
                          <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm text-green-300">
                            This dispute is already resolved or closed.
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={
                            resolving || getStatus(selectedDispute) !== "OPEN"
                          }
                          className="w-full rounded-xl border border-red-400/50 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {resolving ? "Resolving..." : "Resolve Dispute"}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </aside>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon, label, value, color }) {
  const colorClass =
    color === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : color === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : color === "red"
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${colorClass}`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function EvidenceList({ dispute }) {
  const evidences = getEvidences(dispute);

  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
        Evidences
      </p>

      {evidences.length === 0 && (
        <p className="text-sm text-gray-400">No evidences provided.</p>
      )}

      {evidences.length > 0 && (
        <div className="space-y-3">
          {evidences.map((item, index) => (
            <div
              key={getEvidenceId(item) || index}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">
                  {getEvidenceUploader(item)}
                </p>

                <p className="text-xs text-gray-500">
                  {formatDate(getEvidenceCreatedAt(item))}
                </p>
              </div>

              {getEvidenceText(item) && (
                <p className="text-sm leading-6 text-gray-300">
                  {getEvidenceText(item)}
                </p>
              )}

              {getEvidenceFileUrl(item) && (
                <a
                  href={getEvidenceFileUrl(item)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
                >
                  View file
                  <span className="material-symbols-outlined text-sm">
                    open_in_new
                  </span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getDisputeId(dispute) {
  return dispute?.disputeId || dispute?.DisputeId || dispute?.id || dispute?.ID;
}

function getTitle(dispute) {
  return (
    dispute?.title ||
    dispute?.Title ||
    dispute?.reason ||
    dispute?.Reason ||
    `Dispute #${getDisputeId(dispute) || ""}`
  );
}

function getReason(dispute) {
  return dispute?.reason || dispute?.Reason || dispute?.description || "";
}

function getStatus(dispute) {
  return String(dispute?.status || dispute?.Status || "OPEN")
    .trim()
    .toUpperCase();
}

function getProjectTitle(dispute) {
  return (
    dispute?.projectTitle ||
    dispute?.ProjectTitle ||
    dispute?.project?.title ||
    dispute?.project?.Title ||
    "Untitled Project"
  );
}

function getMilestoneTitle(dispute) {
  return (
    dispute?.milestoneTitle ||
    dispute?.MilestoneTitle ||
    dispute?.milestone?.title ||
    dispute?.milestone?.Title ||
    ""
  );
}

function getClientName(dispute) {
  return (
    dispute?.clientName ||
    dispute?.ClientName ||
    dispute?.client?.fullName ||
    dispute?.client?.FullName ||
    dispute?.client?.name ||
    "Client"
  );
}

function getExpertName(dispute) {
  return (
    dispute?.expertName ||
    dispute?.ExpertName ||
    dispute?.expert?.fullName ||
    dispute?.expert?.FullName ||
    dispute?.expert?.name ||
    "Expert"
  );
}

function getDisputedAmount(dispute) {
  return Number(dispute?.disputedAmount || dispute?.DisputedAmount || 0);
}

function getCreatedAt(dispute) {
  return dispute?.createdAt || dispute?.CreatedAt || "";
}

function getEvidences(dispute) {
  const value = dispute?.evidences || dispute?.Evidences || [];
  return Array.isArray(value) ? value : [];
}

function getEvidenceId(item) {
  return item?.evidenceId || item?.EvidenceId || item?.id || item?.ID;
}

function getEvidenceUploader(item) {
  return (
    item?.uploadedByName ||
    item?.UploadedByName ||
    item?.uploaderName ||
    "Uploader"
  );
}

function getEvidenceText(item) {
  return item?.evidenceText || item?.EvidenceText || item?.text || "";
}

function getEvidenceFileUrl(item) {
  return item?.fileUrl || item?.FileUrl || item?.url || "";
}

function getEvidenceCreatedAt(item) {
  return item?.createdAt || item?.CreatedAt || "";
}

function getStatusClass(status) {
  const value = String(status).toUpperCase();

  if (value === "OPEN" || value === "PENDING") {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  if (value === "RESOLVED" || value === "CLOSED") {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  if (value === "REJECTED") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-gray-400/30 bg-gray-400/10 text-gray-300";
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
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