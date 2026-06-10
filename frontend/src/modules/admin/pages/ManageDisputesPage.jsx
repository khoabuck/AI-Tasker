import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminDisputeService from "../../../services/adminDispute.service";

export default function ManageDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [formData, setFormData] = useState({
    decision: "RELEASE_TO_EXPERT",
    adminNote: "",
    refundAmount: "",
    releaseAmount: "",
  });

  const [loading, setLoading] = useState(true);
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
      console.error(err);
      setError("Cannot load disputes. Please check backend API.");
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  const getDisputeId = (dispute) => {
    return dispute.id || dispute.disputeId || dispute.disputeID;
  };

  const getTitle = (dispute) => {
    return dispute.title || dispute.reason || "Untitled Dispute";
  };

  const getDescription = (dispute) => {
    return dispute.description || dispute.content || "";
  };

  const getStatus = (dispute) => {
    return dispute.status || "OPEN";
  };

  const getProjectTitle = (dispute) => {
    return (
      dispute.projectTitle ||
      dispute.project?.title ||
      dispute.jobTitle ||
      "Untitled Project"
    );
  };

  const getClientName = (dispute) => {
    return (
      dispute.clientName ||
      dispute.client?.fullName ||
      dispute.client?.name ||
      "Client"
    );
  };

  const getExpertName = (dispute) => {
    return (
      dispute.expertName ||
      dispute.expert?.fullName ||
      dispute.expert?.name ||
      "Expert"
    );
  };

  const getEvidenceUrl = (dispute) => {
    return dispute.evidenceUrl || dispute.evidence || "";
  };

  const getRequestedResolution = (dispute) => {
    return dispute.requestedResolution || dispute.resolutionRequest || "";
  };

  const getCreatedAt = (dispute) => {
    return dispute.createdAt || dispute.openedAt || dispute.createdDate;
  };

  const formatDate = (value) => {
    if (!value) return "No date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "No date";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const getStatusClass = (status) => {
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
  };

  const filteredDisputes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return disputes.filter((dispute) => {
      const status = String(getStatus(dispute)).toUpperCase();
      const title = getTitle(dispute).toLowerCase();
      const projectTitle = getProjectTitle(dispute).toLowerCase();
      const description = getDescription(dispute).toLowerCase();

      const matchStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const matchSearch =
        !keyword ||
        title.includes(keyword) ||
        projectTitle.includes(keyword) ||
        description.includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [disputes, searchText, statusFilter]);

  const handleSelectDispute = (dispute) => {
    setSelectedDispute(dispute);

    setFormData({
      decision: "RELEASE_TO_EXPERT",
      adminNote: "",
      refundAmount: "",
      releaseAmount: "",
    });

    setMessage("");
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    if (!selectedDispute) {
      return "Please select a dispute first.";
    }

    if (!formData.decision) {
      return "Decision is required.";
    }

    if (!formData.adminNote.trim()) {
      return "Admin note is required.";
    }

    if (formData.adminNote.trim().length < 20) {
      return "Admin note must be at least 20 characters.";
    }

    if (formData.decision === "SPLIT_PAYMENT") {
      if (formData.refundAmount === "" || formData.releaseAmount === "") {
        return "Refund amount and release amount are required for split payment.";
      }

      if (
        Number(formData.refundAmount) < 0 ||
        Number(formData.releaseAmount) < 0
      ) {
        return "Amounts must be 0 or greater.";
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

      await adminDisputeService.resolveDispute(
        getDisputeId(selectedDispute),
        formData
      );

      setMessage("Dispute resolved successfully.");
      setSelectedDispute(null);

      await loadDisputes();
    } catch (err) {
      console.error(err);
      setError("Cannot resolve dispute. Please check backend API.");
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
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Refresh
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
                    placeholder="Search by title, project, or description..."
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
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Total
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
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
                      </div>

                      <h2 className="text-xl font-bold text-white">
                        {getTitle(dispute)}
                      </h2>

                      <p className="mt-2 text-sm text-cyan-300">
                        {getProjectTitle(dispute)}
                      </p>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                        {getDescription(dispute) || "No description provided."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Client: {getClientName(dispute)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Expert: {getExpertName(dispute)}
                        </span>
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
                      <div className="mb-6">
                        <h2 className="text-lg font-bold text-white">
                          Resolve Dispute
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          {getTitle(selectedDispute)}
                        </p>
                      </div>

                      <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                          Requested Resolution
                        </p>

                        <p className="text-sm leading-6 text-gray-300">
                          {getRequestedResolution(selectedDispute) ||
                            "No requested resolution."}
                        </p>

                        {getEvidenceUrl(selectedDispute) && (
                          <a
                            href={getEvidenceUrl(selectedDispute)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
                          >
                            View evidence
                            <span className="material-symbols-outlined text-sm">
                              open_in_new
                            </span>
                          </a>
                        )}
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className={labelStyle}>Decision</label>

                          <select
                            name="decision"
                            value={formData.decision}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                          >
                            <option value="RELEASE_TO_EXPERT">
                              Release money to Expert
                            </option>
                            <option value="REFUND_TO_CLIENT">
                              Refund money to Client
                            </option>
                            <option value="SPLIT_PAYMENT">Split payment</option>
                            <option value="REJECT_DISPUTE">
                              Reject dispute
                            </option>
                          </select>
                        </div>

                        {formData.decision === "SPLIT_PAYMENT" && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className={labelStyle}>
                                Refund Amount
                              </label>

                              <input
                                type="number"
                                name="refundAmount"
                                value={formData.refundAmount}
                                onChange={handleChange}
                                min="0"
                                placeholder="100"
                                className={inputStyle}
                              />
                            </div>

                            <div>
                              <label className={labelStyle}>
                                Release Amount
                              </label>

                              <input
                                type="number"
                                name="releaseAmount"
                                value={formData.releaseAmount}
                                onChange={handleChange}
                                min="0"
                                placeholder="200"
                                className={inputStyle}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className={labelStyle}>Admin Note</label>

                          <textarea
                            name="adminNote"
                            value={formData.adminNote}
                            onChange={handleChange}
                            rows="6"
                            placeholder="Explain why admin makes this decision..."
                            className={`${inputStyle} resize-none`}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={resolving}
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