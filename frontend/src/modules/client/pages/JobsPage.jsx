// src/modules/client/pages/JobsPage.jsx
// GET /api/jobs/my  ← lấy tất cả jobs, FE filter theo query param ?status=
// PUT /api/jobs/{id}/submit  ← submit draft
// PUT /api/jobs/{id}/cancel  ← cancel job
// GET /api/jobs/{jobId}/proposals  ← job không tự biết proposal nào ACCEPTED
// GET /api/proposals/{proposalId}   ← lấy contractId mới nhất nếu list proposals chưa có
// GET /api/contracts/{contractId}   ← lấy trạng thái contract thật
//
// Job OPEN có thể có proposal ACCEPTED.
// Nhưng proposal ACCEPTED không đồng nghĩa luôn là "Awaiting signature":
// - ACCEPTED + chưa có contract      → click về Proposal Detail để Create Contract
// - ACCEPTED + contract DRAFT        → click vào trang ký Contract
// - ACCEPTED + contract CANCELLED    → click về Proposal Detail để Create Contract Again
// - ACCEPTED + contract CONFIRMED    → nếu Project ACTIVE thì đi Project

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const ACCEPTED_DEAL_STATE = {
  NO_CONTRACT: "NO_CONTRACT",
  CONTRACT_DRAFT: "CONTRACT_DRAFT",
  CONTRACT_CANCELLED: "CONTRACT_CANCELLED",
  PROJECT_ACTIVE: "PROJECT_ACTIVE",
  UNKNOWN: "UNKNOWN",
};

const STATUS_TABS = [
  { key: "DRAFT",     label: "Draft",     icon: "draft",  color: "#94a3b8" },
  { key: "OPEN",      label: "Open",      icon: "work",   color: "#00F0FF" },
  { key: "CANCELLED", label: "Cancelled", icon: "cancel", color: "#ef4444" },
];

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
  OPEN:      { label: "Open",      color: "#00F0FF", bg: "rgba(0,240,255,0.08)",   border: "rgba(0,240,255,0.25)"   },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)"   },
};

function normalizeJobStatus(status) {
  const s = (status || "").toUpperCase();
  if (s === "DRAFT") return "DRAFT";
  if (s === "CANCELLED") return "CANCELLED";
  if (s === "ACTIVE") return "ACTIVE"; // Project đã active (escrow locked) → không
    // thuộc về trang Job nữa (trang Job chỉ có 3 tab Draft/Open/Cancelled), nên
    // KHÔNG map về OPEN. Vì STATUS_TABS không có tab "ACTIVE" nào, job này sẽ
    // tự động không hiện ở tab nào cả → coi như đã "biến mất" khỏi trang Job.
  return "OPEN"; // mọi status khác chưa xác định thì tạm coi là OPEN
}

function JobCard({ job, onStatusChange }) {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);
  const [checkingProposal, setCheckingProposal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Lưu đủ trạng thái của proposal ACCEPTED.
  // Không chỉ lưu proposalId, vì còn phải biết contract đang DRAFT hay CANCELLED.
  const [acceptedDeal, setAcceptedDeal] = useState(null);
  const normStatus = normalizeJobStatus(job.status);
  const cfg = STATUS_CONFIG[normStatus] || STATUS_CONFIG.OPEN;

  useEffect(() => {
    if (normStatus !== "OPEN") {
      setAcceptedDeal(null);
      setCheckingProposal(false);
      return;
    }

    let cancelled = false;

    const fetchAcceptedDeal = async () => {
      setCheckingProposal(true);

      try {
        const proposalsRes = await axiosInstance.get(
          `/jobs/${job.jobPostingId}/proposals`
        );

        if (cancelled) return;

        const raw =
          proposalsRes.data?.data ??
          proposalsRes.data;

        const list = Array.isArray(raw)
          ? raw
          : raw?.items ?? [];

        const accepted = list.find(
          (p) =>
            String(p?.status ?? "")
              .trim()
              .toUpperCase() === "ACCEPTED"
        );

        if (!accepted) {
          setAcceptedDeal(null);
          return;
        }

        const proposalId =
          accepted?.proposalId ??
          accepted?.id ??
          null;

        if (!proposalId) {
          setAcceptedDeal(null);
          return;
        }

        /*
        * Một số API list proposals có thể chưa trả contractId.
        * Vì vậy nếu accepted.contractId chưa có thì gọi detail proposal
        * để lấy contractId mới nhất.
        */
        let contractId =
          accepted?.contractId ??
          accepted?.projectContractId ??
          null;

        if (!contractId) {
          try {
            const proposalRes = await axiosInstance.get(
              `/proposals/${proposalId}`
            );

            if (cancelled) return;

            const proposalData =
              proposalRes.data?.data ??
              proposalRes.data ??
              null;

            contractId =
              proposalData?.contractId ??
              proposalData?.projectContractId ??
              null;
          } catch {
            // Không lấy được proposal detail thì vẫn cho click về Proposal Detail.
            contractId = null;
          }
        }

        /*
        * ACCEPTED nhưng chưa có contract:
        * FE phải đưa user về Proposal Detail để bấm Create Contract.
        */
        if (!contractId) {
          setAcceptedDeal({
            proposalId,
            contractId: null,
            projectId: null,
            state: ACCEPTED_DEAL_STATE.NO_CONTRACT,
          });
          return;
        }

        /*
        * Có contractId thì phải đọc contract thật.
        * Không được tự hiểu ACCEPTED là đang chờ ký.
        */
        try {
          const contractRes = await axiosInstance.get(
            `/contracts/${contractId}`
          );

          if (cancelled) return;

          const contract =
            contractRes.data?.data ??
            contractRes.data ??
            null;

          const contractStatus = String(
            contract?.status ?? ""
          )
            .trim()
            .toUpperCase();

          const projectStatus = String(
            contract?.projectStatus ?? ""
          )
            .trim()
            .toUpperCase();

          if (
            contractStatus === "CONFIRMED" &&
            projectStatus === "ACTIVE" &&
            contract?.projectId
          ) {
            setAcceptedDeal({
              proposalId,
              contractId,
              projectId: contract.projectId,
              state: ACCEPTED_DEAL_STATE.PROJECT_ACTIVE,
            });
            return;
          }

          if (contractStatus === "DRAFT") {
            setAcceptedDeal({
              proposalId,
              contractId,
              projectId: null,
              state: ACCEPTED_DEAL_STATE.CONTRACT_DRAFT,
            });
            return;
          }

          if (
            contractStatus === "CANCELLED" ||
            contractStatus === "EXPIRED"
          ) {
            setAcceptedDeal({
              proposalId,
              contractId,
              projectId: null,
              state: ACCEPTED_DEAL_STATE.CONTRACT_CANCELLED,
            });
            return;
          }

          setAcceptedDeal({
            proposalId,
            contractId,
            projectId: contract?.projectId ?? null,
            state: ACCEPTED_DEAL_STATE.UNKNOWN,
          });
        } catch {
          /*
          * Nếu contract API lỗi, vẫn không nên hiện Awaiting Signature.
          * Cho user quay về Proposal Detail để kiểm tra / tạo lại contract.
          */
          setAcceptedDeal({
            proposalId,
            contractId,
            projectId: null,
            state: ACCEPTED_DEAL_STATE.UNKNOWN,
          });
        }
      } catch {
        // Lỗi tra cứu proposal → coi như chưa có accepted deal để job vẫn hiện bình thường.
        setAcceptedDeal(null);
      } finally {
        if (!cancelled) {
          setCheckingProposal(false);
        }
      }
    };

    fetchAcceptedDeal();

    return () => {
      cancelled = true;
    };
  }, [job.jobPostingId, normStatus]);

  const hasAcceptedProposal =
  Boolean(acceptedDeal?.proposalId);

const acceptedDealState =
  acceptedDeal?.state ?? null;

const acceptedDealLabel =
  acceptedDealState === ACCEPTED_DEAL_STATE.CONTRACT_DRAFT
    ? "Awaiting contract signature"
    : acceptedDealState === ACCEPTED_DEAL_STATE.CONTRACT_CANCELLED
    ? "Contract draft cancelled"
    : acceptedDealState === ACCEPTED_DEAL_STATE.NO_CONTRACT
    ? "Contract not created yet"
    : acceptedDealState === ACCEPTED_DEAL_STATE.PROJECT_ACTIVE
    ? "Project active"
    : acceptedDealState === ACCEPTED_DEAL_STATE.UNKNOWN
    ? "Review accepted proposal"
    : "";

    const shouldHideJobActions =
    acceptedDealState === ACCEPTED_DEAL_STATE.CONTRACT_DRAFT ||
    acceptedDealState === ACCEPTED_DEAL_STATE.NO_CONTRACT ||
    acceptedDealState === ACCEPTED_DEAL_STATE.PROJECT_ACTIVE ||
    acceptedDealState === ACCEPTED_DEAL_STATE.UNKNOWN;

const acceptedDealIcon =
  acceptedDealState === ACCEPTED_DEAL_STATE.CONTRACT_DRAFT
    ? "draw"
    : acceptedDealState === ACCEPTED_DEAL_STATE.CONTRACT_CANCELLED
    ? "history"
    : acceptedDealState === ACCEPTED_DEAL_STATE.NO_CONTRACT
    ? "description"
    : acceptedDealState === ACCEPTED_DEAL_STATE.PROJECT_ACTIVE
    ? "verified"
    : "info";

const acceptedDealColor =
  acceptedDealState === ACCEPTED_DEAL_STATE.CONTRACT_DRAFT
    ? "#00F0FF"
    : acceptedDealState === ACCEPTED_DEAL_STATE.CONTRACT_CANCELLED
    ? "#facc15"
    : acceptedDealState === ACCEPTED_DEAL_STATE.PROJECT_ACTIVE
    ? "#22c55e"
    : "#c0c1ff";

  const handleSubmit = async (e) => {
    e.stopPropagation();

    setActionLoading(true);
    try {
      const res = await axiosInstance.put(`/jobs/${job.jobPostingId}/submit`);

      const newStatus = res?.data?.data?.status || "OPEN";

      onStatusChange(job.jobPostingId, newStatus);

      navigate(`/client/jobs?status=OPEN`);
    } catch (err) {
      console.error("Submit job failed:", err);
      alert(err?.response?.data?.message || "Failed to submit job. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelConfirm = (e) => {
    e.stopPropagation();
    setCancelError("");
    setShowCancelConfirm(true);
  };

  const handleCancel = async () => {
    if (actionLoading) return;

    setActionLoading(true);
    setCancelError("");

    try {
      await axiosInstance.put(`/jobs/${job.jobPostingId}/cancel`);

      setShowCancelConfirm(false);
      onStatusChange(job.jobPostingId, "CANCELLED");
      navigate("/client/jobs?status=CANCELLED");
    } catch (err) {
      setCancelError(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Cancellation failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCardClick = () => {
    if (checkingProposal || actionLoading) return;

    if (normStatus === "CANCELLED") return;

    if (hasAcceptedProposal) {
      /*
      * Chỉ contract DRAFT mới đi thẳng vào trang ký.
      * Contract CANCELLED hoặc chưa có contract thì về Proposal Detail
      * để hiện Create Contract / Create Contract Again.
      */
      if (
        acceptedDealState === ACCEPTED_DEAL_STATE.CONTRACT_DRAFT
      ) {
        navigate(
          `/client/proposals/${acceptedDeal.proposalId}/contract`
        );
        return;
      }

      if (
        acceptedDealState === ACCEPTED_DEAL_STATE.PROJECT_ACTIVE &&
        acceptedDeal.projectId
      ) {
        navigate(`/client/projects/${acceptedDeal.projectId}`);
        return;
      }

      navigate(`/client/proposals/${acceptedDeal.proposalId}`);
      return;
    }

    navigate(`/client/jobs/${job.jobPostingId}`);
  };

  return (
    <>
    <div
        onClick={handleCardClick}
        style={{
          background: "rgba(16,19,25,0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          padding: 22,
          cursor: normStatus === "CANCELLED" ? "default" : checkingProposal ? "wait" : "pointer",
          transition: "all 0.2s",
          opacity: checkingProposal ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (normStatus === "CANCELLED") return;
          e.currentTarget.style.borderColor = "rgba(0,240,255,0.3)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
        <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", margin: 0, flex: 1 }}>
          {job.title}
        </h3>
        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>
          {cfg.label}
        </span>
      </div>

      <p style={{ fontSize: 13, color: "#8c90a0", lineHeight: 1.6, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {job.description}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#00F0FF" }}>
            {formatCurrency(job.budgetMin)} – {formatCurrency(job.budgetMax)}
          </span>
          {job.projectType && <span style={{ fontSize: 12, color: "#8c90a0" }}>{job.projectType}</span>}
          {checkingProposal && (
            <span style={{ fontSize: 12, color: "#8c90a0", display: "flex", alignItems: "center", gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, animation: "spin 1s linear infinite" }}>autorenew</span>
              Checking...
            </span>
          )}
          {!checkingProposal && hasAcceptedProposal && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: acceptedDealColor,
              fontWeight: 600,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 14 }}
            >
              {acceptedDealIcon}
            </span>

            {acceptedDealLabel}
          </span>
        )}
        </div>

        {/* Ẩn nút hành động chỉ khi accepted deal còn đang cần tiếp tục xử lý.
            Nếu contract draft đã CANCELLED thì hiện lại các nút như job OPEN ban đầu:
            AI Recommend / Proposals / Edit / Cancel. */}
        {!shouldHideJobActions && (
          <div style={{ display: "flex", gap: 8 }}>
            {normStatus === "DRAFT" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/client/jobs/${job.jobPostingId}/edit`);
                  }}
                  style={{ padding: "6px 12px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Edit
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={actionLoading}
                  style={{ padding: "6px 12px", background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.6 : 1 }}
                >
                  {actionLoading ? "..." : "Submit"}
                </button>

                <button
                  onClick={openCancelConfirm}
                  disabled={actionLoading}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(248,113,113,0.08)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? "..." : "Cancel"}
                </button>
              </>
            )}
            {normStatus === "OPEN" && (
              <>
                <button onClick={(e) => { e.stopPropagation(); navigate(`/client/jobs/${job.jobPostingId}/recommendations`); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(192,193,255,0.08)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
                  AI Recommend
                </button>
                <button onClick={(e) => { e.stopPropagation(); navigate(`/client/jobs/${job.jobPostingId}`); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>description</span>
                  Proposals
                  {job.proposalCount != null && job.proposalCount > 0 && (
                    <span style={{ background: "#facc15", color: "#1d1500", borderRadius: 999, padding: "0 6px", fontSize: 10, fontWeight: 700 }}>
                      {job.proposalCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/client/jobs/${job.jobPostingId}/edit`);
                  }}
                  style={{ padding: "6px 12px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Edit
                </button>
                
                <button
                  onClick={openCancelConfirm}
                  disabled={actionLoading}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(248,113,113,0.08)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? "..." : "Cancel"}
                </button>
              </>


            )}
          </div>
        )}
      </div>


        </div>

    {showCancelConfirm && (
      <div
        onClick={() => {
          if (!actionLoading) {
            setShowCancelConfirm(false);
          }
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 440,
            background: "rgba(16,19,25,0.98)",
            border: "1px solid rgba(248,113,113,0.28)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3
              style={{
                fontFamily: "Hanken Grotesk, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#f87171",
                margin: 0,
              }}
            >
              Cancel Job
            </h3>

            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              disabled={actionLoading}
              style={{
                background: "none",
                border: "none",
                color: "#8c90a0",
                cursor: actionLoading ? "not-allowed" : "pointer",
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
              margin: "0 0 16px",
            }}
          >
            Are you sure you want to cancel this job? This action may make the job unavailable to experts.
          </p>

          {cancelError && (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#f87171",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {cancelError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              disabled={actionLoading}
              style={{
                padding: "10px 18px",
                background: "transparent",
                color: "#c2c6d6",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                cursor: actionLoading ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              Keep Job
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={actionLoading}
              style={{
                padding: "10px 18px",
                background: actionLoading
                  ? "#1d2026"
                  : "rgba(248,113,113,0.95)",
                color: actionLoading ? "#8c90a0" : "#1a0000",
                border: "none",
                borderRadius: 8,
                cursor: actionLoading ? "not-allowed" : "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {actionLoading ? (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, animation: "spin 1s linear infinite" }}
                  >
                    autorenew
                  </span>
                  Cancelling...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    cancel
                  </span>
                  Cancel Job
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const activeStatus = searchParams.get("status") || "DRAFT";

  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasLoadedOnce = useRef(false);

  const fetchJobs = useCallback(async (signal) => {
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    setError("");
    try {
      const res = await axiosInstance.get("/jobs/my", { signal });
      const raw = res.data;
      setAllJobs(Array.isArray(raw) ? raw : raw.items ?? raw.data ?? []);
      hasLoadedOnce.current = true;
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(err?.response?.data?.message || "Could not load jobs list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchJobs(controller.signal);
    return () => controller.abort();
  }, [fetchJobs, location.key]);

  const handleStatusChange = (jobId, newStatus) => {
    setAllJobs((prev) => {
      const updated = prev.map((j) =>
        j.jobPostingId === jobId ? { ...j, status: newStatus } : j
      );
      const target = updated.find((j) => j.jobPostingId === jobId);
      const rest = updated.filter((j) => j.jobPostingId !== jobId);
      return target ? [target, ...rest] : updated;
    });
  };

  const filteredJobs = allJobs.filter((j) => {
    const status = normalizeJobStatus(j.status);
    return status === activeStatus;
  });

  const showFullLoading = loading && allJobs.length === 0;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <ClientLayout>
      <div style={{ minHeight: "100vh", background: "#0b0e14" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 30, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>My Jobs</h1>
              <p style={{ color: "#8c90a0", fontSize: 14, margin: 0 }}>Manage your job postings.</p>
            </div>
            <button onClick={() => navigate("/client/post-job")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", fontWeight: 700, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontFamily: "Hanken Grotesk, sans-serif", boxShadow: "0 0 16px rgba(0,240,255,0.2)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Post New Job
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {STATUS_TABS.map((tab) => {
              const count = allJobs.filter(
                (j) => normalizeJobStatus(j.status) === tab.key
              ).length;
              const active = activeStatus === tab.key;
              return (
                <button key={tab.key}
                  onClick={() => setSearchParams({ status: tab.key })}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "none", border: "none", borderBottom: active ? `2px solid ${tab.color}` : "2px solid transparent", color: active ? tab.color : "#8c90a0", cursor: "pointer", fontSize: 14, fontWeight: active ? 700 : 500, fontFamily: "Inter, sans-serif", transition: "all 0.2s", marginBottom: -1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                  {tab.label}
                  <span style={{ padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", background: active ? tab.color + "20" : "rgba(255,255,255,0.06)", color: active ? tab.color : "#8c90a0" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {showFullLoading && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
              Loading jobs...
            </div>
          )}

          {error && !showFullLoading && (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
              <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error}</p>
              <button onClick={() => fetchJobs(new AbortController().signal)}
                style={{ padding: "10px 24px", background: "rgba(0,240,255,0.08)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                Retry
              </button>
            </div>
          )}

          {!showFullLoading && !error && filteredJobs.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 72, display: "block", marginBottom: 16, color: "#272a30" }}>inbox</span>
              <p style={{ color: "#8c90a0", fontSize: 16, marginBottom: 6 }}>No jobs are currently in this state {STATUS_CONFIG[activeStatus]?.label}</p>
            </div>
          )}

          {!showFullLoading && !error && filteredJobs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredJobs.map((job) => (
                <JobCard key={job.jobPostingId} job={job} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}