// src/modules/client/pages/MilestoneDeliverablesPage.jsx
//
// GET  /api/milestones/{milestoneId}                       → thông tin milestone
// GET  /api/milestones/{milestoneId}/deliverables           → list deliverable đã submit
// POST /api/deliverables/{deliverableId}/approve            → Client chấp nhận deliverable
// POST /api/deliverables/{deliverableId}/request-revision   → Client yêu cầu sửa lại (RevisionRequest)

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const cardStyle = {
  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

const sectionLabel = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#8c90a0",
  marginBottom: 8,
  display: "block",
};

const STATUS_CONFIG = {
  SUBMITTED: {
    label: "Submitted",
    className:
      "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  },

  APPROVED: {
    label: "Approved",
    className:
      "border-green-500/30 bg-green-500/10 text-green-500",
  },

  REVISION_REQUESTED: {
    label: "Revision Requested",
    className:
      "border-red-400/30 bg-red-400/10 text-red-400",
  },

  REJECTED: {
    label: "Rejected",
    className:
      "border-red-400/30 bg-red-400/10 text-red-400",
  },
};

// Hiển thị 1 link field — nhiều field deliverable trỏ về cùng 1 URL placeholder
// trong dữ liệu test hiện tại (fileUrl/demoUrl/testResultUrl giống nhau), nhưng
// về mặt schema đây là 3 link khác nhau nên vẫn hiển thị riêng từng ô.
function LinkRow({ icon, label, url }) {
  if (!url) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: "#8c90a0", margin: "0 0 2px", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: "#c2c6d6", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#c2c6d6")}>
          {url}
        </a>
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#8c90a0", flexShrink: 0 }}>open_in_new</span>
    </div>
  );
}

// ── Request Revision Modal ──────────────────────────────────────────
function RequestRevisionModal({ onClose, onSubmit, submitting, error }) {
  const [note, setNote] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#facc15", margin: 0 }}>Request Revision</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <label style={sectionLabel}>Revision details <span style={{ color: "#f87171" }}>*</span></label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5}
          placeholder="Describe exactly what is not acceptable and what should be fixed..."
          style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box", marginBottom: 16 }} />

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={() => onSubmit(note)} disabled={submitting || !note.trim()}
            style={{ flex: 2, padding: "12px", background: submitting ? "#1d2026" : "#facc15", color: submitting ? "#8c90a0" : "#1d1500", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: submitting || !note.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {submitting
              ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>Sending...</>
              : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>Send Revision Request</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MilestoneDeliverablesPage() {
  const { milestoneId } = useParams();
  const navigate = useNavigate();

  const [milestone, setMilestone] = useState(null);

  // Toàn bộ lịch sử v1, v2, v3...
  const [deliverables, setDeliverables] = useState([]);

  // Bản mới nhất để Client review / approve / request revision.
  const [deliverable, setDeliverable] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // "approve" | "revision"
  const [actionError, setActionError] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = useCallback(async (signal, silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const msRes = await axiosInstance.get(`/milestones/${milestoneId}`, { signal });
      const msData = msRes.data?.data ?? msRes.data;
      setMilestone(msData);

      const delRes = await axiosInstance.get(
        `/milestones/${milestoneId}/deliverables`,
        { signal }
      );

      const delRaw = delRes.data?.data ?? delRes.data;

      const list = Array.isArray(delRaw)
        ? delRaw
        : delRaw?.items ?? [];

      const sortedDeliverables = [...list].sort(
        (a, b) =>
          (b.versionNumber ?? 0) -
          (a.versionNumber ?? 0)
      );

      setDeliverables(sortedDeliverables);

      setDeliverable(
        sortedDeliverables[0] ?? null
      );
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;

      if (!silent) {
        setError(err?.response?.data?.message || "Unable to load deliverable.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [milestoneId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const DELIVERABLE_POLL_INTERVAL = 3000;

    useEffect(() => {
      const intervalId = setInterval(() => {
        fetchData(undefined, true);
      }, DELIVERABLE_POLL_INTERVAL);

      return () => clearInterval(intervalId);
    }, [fetchData]);

  const handleApprove = async () => {
    if (!deliverable?.deliverableId) return;

    setShowApproveModal(false);
    setActionLoading("approve");
    setActionError("");

    try {
      const res = await axiosInstance.post(
        `/deliverables/${deliverable.deliverableId}/approve`
      );

      navigate(`/client/projects/${milestone.projectId}`, {
        state: {
          successMsg:
            res.data?.message || "Deliverable approved successfully.",
        },
      });
    } catch (err) {
      setActionError(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Approval failed. Please try again."
      );
      setActionLoading(null);
    }
  };

  const handleRequestRevision = async (note) => {
    if (!deliverable?.deliverableId) return;

    setActionLoading("revision");
    setActionError("");
    try {
      await axiosInstance.post(`/deliverables/${deliverable.deliverableId}/request-revision`, {
        feedback: note,
      });
      setShowRevisionModal(false);
      setSuccessMsg("Revision request has been sent to the Expert.");
      await fetchData();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Failed to send revision request.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading deliverable...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  if (error || !milestone) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 24px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
          <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error || "Milestone not found."}</p>
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1.5 border-none bg-transparent p-0 text-sm text-gray-400 transition hover:text-cyan-400"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Back
          </button>
        </div>
      </ClientLayout>
    );
  }

  const normalizedStatus = (deliverable?.status || "").toUpperCase();

  const dStatus =
    STATUS_CONFIG[normalizedStatus] || {
      label: normalizedStatus || "Unknown",
      className:
        "border-gray-500/30 bg-gray-500/10 text-gray-400",
    };

  const canReview = normalizedStatus === "SUBMITTED";
  const submittedAt = deliverable?.submittedAt
    ? new Date(deliverable.submittedAt).toLocaleString("vi-VN")
    : "—";
  const reviewDeadline = deliverable?.reviewDeadlineAt
    ? new Date(deliverable.reviewDeadlineAt).toLocaleString("vi-VN")
    : null;

  return (
    <ClientLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

        <button onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back 
        </button>

        {successMsg && (
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: "#8c90a0", margin: "0 0 4px" }}>{milestone.projectTitle}</p>
              <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
                {milestone.title}
              </h1>
            </div>
            {deliverable && (
            <span
              className={`whitespace-nowrap rounded-full border px-3 py-1
                font-mono text-[11px] font-bold uppercase
                ${
                  dStatus.className ??
                  "border-gray-500/30 bg-gray-500/10 text-gray-400"
                }
              `}
            >
              {dStatus.label}
            </span>
          )}
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <span style={sectionLabel}>Milestone Amount</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#00F0FF" }}>
                {milestone.amount != null
                  ? formatCurrency(milestone.amount)
                  : "—"}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Submitted</span>
              <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>{submittedAt}</div>
            </div>
            {reviewDeadline && (
              <div>
                <span style={sectionLabel}>Review Deadline</span>
                <div style={{ fontSize: 13, color: "#facc15", fontWeight: 600 }}>{reviewDeadline}</div>
              </div>
            )}
            {deliverable?.versionNumber != null && (
              <div>
                <span style={sectionLabel}>Version</span>
                <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>v{deliverable.versionNumber}</div>
              </div>
            )}
          </div>
        </div>

        {!deliverable ? (
          <div style={cardStyle}>
            <p style={{ fontSize: 14, color: "#8c90a0", textAlign: "center", padding: "24px 0" }}>
              Expert has not yet submitted a deliverable for this milestone.
            </p>
          </div>
        ) : (
          <>
            {/* Links */}
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                Deliverable Links
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <LinkRow icon="folder_zip" label="File" url={deliverable.fileUrl} />
                <LinkRow icon="play_circle" label="Demo" url={deliverable.demoUrl} />
                <LinkRow icon="fact_check" label="Test Result" url={deliverable.testResultUrl} />
              </div>
            </div>

            {/* Description + Handover Notes */}
            {deliverable.description && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  Description
                </h3>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0, wordBreak: "break-word" }}>
                  {deliverable.description}
                </p>
              </div>
            )}

            {/* demoInstructions */}
            {deliverable.demoInstructions && (
            <div className="mb-5 rounded-2xl border border-white/10 bg-[#101319]/85 p-7 shadow-xl backdrop-blur-xl">
              <h3 className="mb-4 border-b border-white/10 pb-3 font-['Hanken_Grotesk'] text-[15px] font-bold text-[#e1e2eb]">
                Demo Instructions
              </h3>

              <p className="m-0 whitespace-pre-line break-words text-sm leading-7 text-[#c2c6d6]">
                {deliverable.demoInstructions}
              </p>
            </div>
          )}

            {/* Test Summary */}
            {deliverable.testSummary && (
            <div className="mb-5 rounded-2xl border border-white/10 bg-[#101319]/85 p-7 shadow-xl backdrop-blur-xl">
              <h3 className="mb-4 border-b border-white/10 pb-3 font-['Hanken_Grotesk'] text-[15px] font-bold text-[#e1e2eb]">
                Test Summary
              </h3>

              <p className="m-0 whitespace-pre-line break-words text-sm leading-7 text-[#c2c6d6]">
                {deliverable.testSummary}
              </p>
            </div>
          )}

            {deliverable.handoverNotes && (
              <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(192,193,255,0.15)", background: "rgba(192,193,255,0.02)" }}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#c0c1ff", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(192,193,255,0.1)" }}>
                  Handover Notes
                </h3>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0, wordBreak: "break-word" }}>
                  {deliverable.handoverNotes}
                </p>
              </div>
            )}

            {deliverables.length > 0 && (
              <div className="mb-5 rounded-2xl border border-white/10 bg-[#101319]/85 p-7 shadow-xl backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="m-0 font-['Hanken_Grotesk'] text-[15px] font-bold text-[#e1e2eb]">
                      Submission History
                    </h3>

                    <p className="mt-1 text-xs text-[#8c90a0]">
                      Track previous submissions and client review status.
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 font-mono text-xs font-bold text-cyan-400">
                    {deliverables.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {deliverables.map((item) => {
                    const itemStatus = String(
                      item?.status ?? ""
                    )
                      .trim()
                      .toUpperCase();

                    const statusConfig =
                      STATUS_CONFIG[itemStatus] ?? {
                        label: itemStatus || "Unknown",
                        className:
                          "border-gray-500/30 bg-gray-500/10 text-gray-400",
                      };

                    const itemSubmittedAt =
                      item?.submittedAt
                        ? new Date(
                            item.submittedAt
                          ).toLocaleString("vi-VN")
                        : "—";

                    const itemReviewedAt =
                      item?.reviewedAt
                        ? new Date(
                            item.reviewedAt
                          ).toLocaleString("vi-VN")
                        : null;

                    return (
                      <div
                        key={item.deliverableId}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-cyan-400">
                              history
                            </span>

                            <span className="text-sm font-bold text-[#e1e2eb]">
                              Version v{item.versionNumber ?? "—"}
                            </span>
                          </div>

                          <span
                            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#8c90a0]">
                          <div>
                            <span className="font-semibold text-[#c2c6d6]">
                              Submitted:
                            </span>{" "}
                            {itemSubmittedAt}
                          </div>

                          {itemReviewedAt && (
                            <div>
                              <span className="font-semibold text-[#c2c6d6]">
                                Reviewed:
                              </span>{" "}
                              {itemReviewedAt}
                            </div>
                          )}
                        </div>

                        {item.clientFeedback && (
                          <div className="mt-3 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.06] p-3">
                            <div className="mb-1 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-yellow-400">
                                rate_review
                              </span>

                              <span className="text-xs font-bold text-yellow-400">
                                Client Feedback
                              </span>
                            </div>

                            <p className="m-0 whitespace-pre-line break-words text-[13px] leading-6 text-[#c2c6d6]">
                              {item.clientFeedback}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedVersion(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-400/15"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              visibility
                            </span>
                            View Details
                          </button>
                          {item.fileUrl && (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#c2c6d6] transition hover:border-cyan-400/30 hover:text-cyan-400"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                folder_zip
                              </span>
                              File
                            </a>
                          )}

                          {item.demoUrl && (
                            <a
                              href={item.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#c2c6d6] transition hover:border-cyan-400/30 hover:text-cyan-400"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                play_circle
                              </span>
                              Demo
                            </a>
                          )}

                          {item.testResultUrl && (
                            <a
                              href={item.testResultUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#c2c6d6] transition hover:border-cyan-400/30 hover:text-cyan-400"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                fact_check
                              </span>
                              Test Result
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Acceptance Criteria — từ milestone, để client review đối chiếu */}
            {milestone.acceptanceCriteria && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  Acceptance Criteria
                </h3>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
                  {milestone.acceptanceCriteria}
                </p>
              </div>
            )}


            {actionError && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 20 }}>{actionError}</div>
            )}

            {/* Actions — chỉ hiện khi deliverable đang chờ review */}
            {canReview && (
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setShowRevisionModal(true)} disabled={!!actionLoading}
                  style={{ flex: 1, padding: "13px", background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit_note</span>
                  Request Revision
                </button>
                <button
                  onClick={() => setShowApproveModal(true)}
                  disabled={!!actionLoading}
                  style={{
                    flex: 1,
                    padding: "13px",
                    background: actionLoading === "approve" ? "#1d2026" : "#22c55e",
                    color: actionLoading === "approve" ? "#8c90a0" : "#002022",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {actionLoading === "approve" ? (
                    <>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18, animation: "spin 1s linear infinite" }}
                      >
                        autorenew
                      </span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        check_circle
                      </span>
                      Approve Deliverable
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedVersion && (
      <div
        onClick={() => setSelectedVersion(null)}
        className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#101319] p-7 shadow-2xl
            [scrollbar-width:none]
            [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden"
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-[#8c90a0]">
                Submission Version
              </p>

              <h3 className="m-0 text-xl font-bold text-[#e1e2eb]">
                Version v{selectedVersion.versionNumber ?? "—"}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setSelectedVersion(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#8c90a0] transition hover:border-white/20 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>
          </div>

          {/* Status + Time */}
          <div className="mb-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#c2c6d6]">
              Status:{" "}
              {STATUS_CONFIG[
                String(selectedVersion.status ?? "")
                  .trim()
                  .toUpperCase()
              ]?.label ??
                selectedVersion.status ??
                "Unknown"}
            </span>

            {selectedVersion.submittedAt && (
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#c2c6d6]">
                Submitted:{" "}
                {new Date(
                  selectedVersion.submittedAt
                ).toLocaleString("vi-VN")}
              </span>
            )}

            {selectedVersion.reviewedAt && (
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#c2c6d6]">
                Reviewed:{" "}
                {new Date(
                  selectedVersion.reviewedAt
                ).toLocaleString("vi-VN")}
              </span>
            )}
          </div>

          {/* Links */}
          <div className="mb-5">
            <h4 className="mb-3 text-sm font-bold text-[#e1e2eb]">
              Deliverable Links
            </h4>

            <div className="flex flex-col gap-2">
              {selectedVersion.fileUrl && (
                <a
                  href={selectedVersion.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-[#c2c6d6] transition hover:border-cyan-400/30 hover:text-cyan-400"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    folder_zip
                  </span>
                  File / Repository
                </a>
              )}

              {selectedVersion.demoUrl && (
                <a
                  href={selectedVersion.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-[#c2c6d6] transition hover:border-cyan-400/30 hover:text-cyan-400"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    play_circle
                  </span>
                  Demo
                </a>
              )}

              {selectedVersion.testResultUrl && (
                <a
                  href={selectedVersion.testResultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-[#c2c6d6] transition hover:border-cyan-400/30 hover:text-cyan-400"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    fact_check
                  </span>
                  Test Result
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          {selectedVersion.description && (
            <div className="mb-5">
              <h4 className="mb-2 text-sm font-bold text-[#e1e2eb]">
                Description
              </h4>

              <p className="m-0 whitespace-pre-line break-words text-sm leading-7 text-[#c2c6d6]">
                {selectedVersion.description}
              </p>
            </div>
          )}

          {/* Demo Instructions */}
          {selectedVersion.demoInstructions && (
            <div className="mb-5">
              <h4 className="mb-2 text-sm font-bold text-[#e1e2eb]">
                Demo Instructions
              </h4>

              <p className="m-0 whitespace-pre-line break-words text-sm leading-7 text-[#c2c6d6]">
                {selectedVersion.demoInstructions}
              </p>
            </div>
          )}

          {/* Test Summary */}
          {selectedVersion.testSummary && (
            <div className="mb-5">
              <h4 className="mb-2 text-sm font-bold text-[#e1e2eb]">
                Test Summary
              </h4>

              <p className="m-0 whitespace-pre-line break-words text-sm leading-7 text-[#c2c6d6]">
                {selectedVersion.testSummary}
              </p>
            </div>
          )}

          {/* Handover Notes */}
          {selectedVersion.handoverNotes && (
            <div className="mb-5">
              <h4 className="mb-2 text-sm font-bold text-[#c0c1ff]">
                Handover Notes
              </h4>

              <p className="m-0 whitespace-pre-line break-words text-sm leading-7 text-[#c2c6d6]">
                {selectedVersion.handoverNotes}
              </p>
            </div>
          )}

          {/* Client Feedback */}
          {selectedVersion.clientFeedback && (
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px] text-yellow-400">
                  rate_review
                </span>

                <span className="text-sm font-bold text-yellow-400">
                  Client Feedback
                </span>
              </div>

              <p className="m-0 whitespace-pre-line break-words text-sm leading-7 text-[#c2c6d6]">
                {selectedVersion.clientFeedback}
              </p>
            </div>
          )}
        </div>
      </div>
    )}

      {showRevisionModal && (
      <RequestRevisionModal
        onClose={() => setShowRevisionModal(false)}
        onSubmit={handleRequestRevision}
        submitting={actionLoading === "revision"}
        error={actionError}
      />
    )}

    {showApproveModal && (
      <div
        onClick={() => setShowApproveModal(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "rgba(16,19,25,0.98)",
            border: "1px solid rgba(34,197,94,0.28)",
            borderRadius: 16,
            padding: 28,
            width: "100%",
            maxWidth: 460,
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontFamily: "Hanken Grotesk, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#22c55e",
                margin: 0,
              }}
            >
              Approve Deliverable
            </h3>

            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              style={{
                background: "none",
                border: "none",
                color: "#8c90a0",
                cursor: "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                close
              </span>
            </button>
          </div>

          <p
            style={{
              fontSize: 14,
              color: "#c2c6d6",
              lineHeight: 1.7,
              margin: "0 0 20px",
            }}
          >
            Confirm this deliverable meets requirements. This action cannot be
            undone.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              style={{
                flex: 1,
                padding: "12px",
                background: "transparent",
                color: "#c2c6d6",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={actionLoading === "approve"}
              style={{
                flex: 2,
                padding: "12px",
                background:
                  actionLoading === "approve" ? "#1d2026" : "#22c55e",
                color:
                  actionLoading === "approve" ? "#8c90a0" : "#002022",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  actionLoading === "approve" ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {actionLoading === "approve" ? (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, animation: "spin 1s linear infinite" }}
                  >
                    autorenew
                  </span>
                  Processing...
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16 }}
                  >
                    check_circle
                  </span>
                  Approve
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}