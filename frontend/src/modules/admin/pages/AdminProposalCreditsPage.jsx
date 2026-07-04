import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminProposalCreditService from "../../../services/adminProposalCredit.service";

export default function AdminProposalCreditsPage() {
  const [experts, setExperts] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    profileReviewStatus: "ALL",
    availableForWork: "ALL",
  });

  const [selectedExpert, setSelectedExpert] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [creditDelta, setCreditDelta] = useState(1);
  const [reason, setReason] = useState("");
  const [freeSubmitReason, setFreeSubmitReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [adjustErrors, setAdjustErrors] = useState({});
  const [freeSubmitError, setFreeSubmitError] = useState("");

  useEffect(() => {
    loadExperts();
  }, []);

  const stats = useMemo(() => {
    return {
      total: experts.length,
      canSubmit: experts.filter((item) => item.canSubmitProposal).length,
      available: experts.filter((item) => item.availableForWork).length,
      totalCredits: experts.reduce(
        (sum, item) => sum + Number(item.proposalSubmitCredits || 0),
        0
      ),
    };
  }, [experts]);

  const loadExperts = async (overrideFilters = filters) => {
    try {
      setLoading(true);
      setError("");

      const data = await adminProposalCreditService.getExpertCredits(
        overrideFilters
      );

      setExperts(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Cannot load expert credits.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadExperts(filters);
  };

  const handleReset = async () => {
    const resetFilters = {
      search: "",
      profileReviewStatus: "ALL",
      availableForWork: "ALL",
    };

    setFilters(resetFilters);
    await loadExperts(resetFilters);
  };

  const openManageModal = async (expert) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");
      setModalError("");
      setAdjustErrors({});
      setFreeSubmitError("");

      const data = await adminProposalCreditService.getExpertCreditById(
        expert.expertProfileId
      );

      setSelectedExpert(data);
      setCreditDelta(1);
      setReason("");
      setFreeSubmitReason("");
      setShowModal(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Cannot load expert detail.");
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    if (actionLoading) return;

    setShowModal(false);
    setSelectedExpert(null);
    setCreditDelta(1);
    setReason("");
    setFreeSubmitReason("");
    setModalError("");
    setAdjustErrors({});
    setFreeSubmitError("");
  };

  const handleAdjustCredits = async (e) => {
    e.preventDefault();

    if (!selectedExpert) return;

    const errors = {};
    const creditText = String(creditDelta ?? "").trim();

    if (!creditText) {
      errors.creditDelta = "Credit delta is required.";
    } else if (!/^-?\d+$/.test(creditText)) {
      errors.creditDelta = "Credit delta must be a whole number.";
    } else if (Number(creditText) === 0) {
      errors.creditDelta = "Credit delta must be different from 0.";
    }

    if (!reason.trim()) {
      errors.reason = "Reason is required.";
    }

    if (Object.keys(errors).length > 0) {
      setAdjustErrors(errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const updated = await adminProposalCreditService.adjustCredits(
        selectedExpert.expertProfileId,
        Number(creditText),
        reason
      );

      setSelectedExpert(updated);
      setMessage("Proposal credits updated successfully.");
      setReason("");
      setAdjustErrors({});
      setModalError("");
      await loadExperts();
    } catch (err) {
      setError(err?.response?.data?.message || "Cannot adjust credits.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetFreeSubmit = async (freeProposalSubmitUsed) => {
    if (!selectedExpert) return;

    if (!freeSubmitReason.trim()) {
      setFreeSubmitError("Reason is required for free submit update.");
      setModalError("Please fix the highlighted fields.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const updated = await adminProposalCreditService.setFreeSubmit(
        selectedExpert.expertProfileId,
        freeProposalSubmitUsed,
        freeSubmitReason
      );

      setSelectedExpert(updated);
      setMessage("Free submit status updated successfully.");
      setFreeSubmitReason("");
      setFreeSubmitError("");
      setModalError("");
      await loadExperts();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Cannot update free submit status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            Admin / Proposal Credits
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Expert Proposal Credits
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Quản lý số credit submit proposal và quyền free submit của Expert.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Experts" value={stats.total} />
          <StatCard label="Can Submit" value={stats.canSubmit} />
          <StatCard label="Available" value={stats.available} />
          <StatCard label="Total Credits" value={stats.totalCredits} />
        </div>

        <form
          onSubmit={handleSearch}
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto_auto]">
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search expert name or email..."
              className="rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
            />

            <select
              name="profileReviewStatus"
              value={filters.profileReviewStatus}
              onChange={handleFilterChange}
              className="rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-400/50"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="LOCKED">Locked</option>
            </select>

            <select
              name="availableForWork"
              value={filters.availableForWork}
              onChange={handleFilterChange}
              className="rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-400/50"
            >
              <option value="ALL">All Work</option>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
            >
              Search
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Loading...
            </div>
          ) : (
            <div
              className="overflow-x-auto"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <style>
                {`
                  .admin-proposal-credit-scroll::-webkit-scrollbar {
                    display: none;
                  }
                `}
              </style>

              <div className="admin-proposal-credit-scroll overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/[0.04]">
                    <tr>
                      <Th>Expert</Th>
                      <Th>Status</Th>
                      <Th>Credits</Th>
                      <Th>Free Submit</Th>
                      <Th>Can Submit</Th>
                      <Th>Action</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {experts.map((expert) => (
                      <tr
                        key={expert.expertProfileId}
                        className="hover:bg-white/[0.03]"
                      >
                        <Td>
                          <div>
                            <p className="font-bold text-white">
                              {expert.fullName}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {expert.email}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {expert.professionalTitle || "-"}
                            </p>
                          </div>
                        </Td>

                        <Td>
                          <div className="space-y-1">
                            <Badge>{expert.profileReviewStatus || "-"}</Badge>
                            <p className="text-xs text-gray-500">
                              {expert.availableForWork
                                ? "Available"
                                : "Unavailable"}
                            </p>
                          </div>
                        </Td>

                        <Td>
                          <span className="text-lg font-black text-white">
                            {expert.proposalSubmitCredits}
                          </span>
                        </Td>

                        <Td>
                          {expert.freeProposalSubmitRemaining > 0 ? (
                            <span className="font-bold text-emerald-300">
                              Available
                            </span>
                          ) : (
                            <span className="text-gray-500">Used</span>
                          )}
                        </Td>

                        <Td>
                          {expert.canSubmitProposal ? (
                            <span className="font-bold text-emerald-300">
                              Yes
                            </span>
                          ) : (
                            <span className="font-bold text-red-300">No</span>
                          )}
                        </Td>

                        <Td>
                          <button
                            type="button"
                            onClick={() => openManageModal(expert)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/10"
                          >
                            Manage
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {experts.length === 0 && (
                  <div className="p-8 text-center text-sm text-gray-400">
                    No expert credits found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showModal && selectedExpert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0d1117] shadow-2xl">
              <div className="flex items-start justify-between border-b border-white/10 p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                    Manage Expert Credits
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {selectedExpert.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    {selectedExpert.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={actionLoading}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm font-black text-gray-300 hover:bg-white/10 disabled:opacity-60"
                >
                  ✕
                </button>
              </div>

              <div
                className="max-h-[75vh] overflow-y-auto p-6"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <style>
                  {`
                    .admin-proposal-credit-modal::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>

                <div className="admin-proposal-credit-modal space-y-6">
                  {modalError && (
                    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
                      {modalError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <MiniInfo
                      label="Current Credits"
                      value={selectedExpert.proposalSubmitCredits}
                    />
                    <MiniInfo
                      label="Can Submit"
                      value={selectedExpert.canSubmitProposal ? "Yes" : "No"}
                    />
                    <MiniInfo
                      label="Free Remaining"
                      value={selectedExpert.freeProposalSubmitRemaining}
                    />
                    <MiniInfo
                      label="Free Used"
                      value={selectedExpert.freeProposalSubmitUsed ? "Yes" : "No"}
                    />
                  </div>

                  <form
                    onSubmit={handleAdjustCredits}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <h3 className="text-sm font-black uppercase tracking-[0.16em] text-cyan-300">
                      Adjust Credits
                    </h3>

                    <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={creditDelta}
                          onChange={(e) => {
                            setCreditDelta(e.target.value);
                            setModalError("");
                            setAdjustErrors((prev) => ({
                              ...prev,
                              creditDelta: "",
                            }));
                          }}
                          placeholder="Example: 5 or -2"
                          className={`w-full rounded-2xl border bg-[#070b10] px-4 py-3 text-sm text-white outline-none ${
                            adjustErrors.creditDelta
                              ? "border-red-400/70 focus:border-red-400"
                              : "border-white/10 focus:border-cyan-400/50"
                          }`}
                        />

                        {adjustErrors.creditDelta && (
                          <p className="mt-2 text-xs font-semibold text-red-300">
                            {adjustErrors.creditDelta}
                          </p>
                        )}
                      </div>

                      <div>
                        <textarea
                          value={reason}
                          onChange={(e) => {
                            setReason(e.target.value);
                            setModalError("");
                            setAdjustErrors((prev) => ({
                              ...prev,
                              reason: "",
                            }));
                          }}
                          rows={3}
                          placeholder="Reason for audit log"
                          className={`w-full rounded-2xl border bg-[#070b10] px-4 py-3 text-sm text-white outline-none ${
                            adjustErrors.reason
                              ? "border-red-400/70 focus:border-red-400"
                              : "border-white/10 focus:border-cyan-400/50"
                          }`}
                        />

                        {adjustErrors.reason && (
                          <p className="mt-2 text-xs font-semibold text-red-300">
                            {adjustErrors.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                    >
                      {actionLoading ? "Saving..." : "Apply Credit Change"}
                    </button>
                  </form>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <h3 className="text-sm font-black uppercase tracking-[0.16em] text-cyan-300">
                      Free Submit
                    </h3>

                    <textarea
                      value={freeSubmitReason}
                      onChange={(e) => {
                        setFreeSubmitReason(e.target.value);
                        setModalError("");
                        setFreeSubmitError("");
                      }}
                      rows={3}
                      placeholder="Reason for audit log"
                      className={`mt-4 w-full rounded-2xl border bg-[#070b10] px-4 py-3 text-sm text-white outline-none ${
                        freeSubmitError
                          ? "border-red-400/70 focus:border-red-400"
                          : "border-white/10 focus:border-cyan-400/50"
                      }`}
                    />

                    {freeSubmitError && (
                      <p className="mt-2 text-xs font-semibold text-red-300">
                        {freeSubmitError}
                      </p>
                    )}

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleSetFreeSubmit(false)}
                        className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-60"
                      >
                        Grant Free Submit
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleSetFreeSubmit(true)}
                        className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-400/20 disabled:opacity-60"
                      >
                        Mark Free Used
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      Grant Free Submit sẽ set freeProposalSubmitUsed = false.
                      Mark Free Used sẽ set freeProposalSubmitUsed = true.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-white/10 p-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={actionLoading}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 hover:bg-white/10 disabled:opacity-60"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#070b10] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-black uppercase text-cyan-200">
      {children}
    </span>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-gray-500">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-5 py-4 text-sm text-gray-300">{children}</td>;
}