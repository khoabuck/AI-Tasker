// src/modules/client/pages/ClientProjectDetailPage.jsx
//
// GET  /api/projects/{projectId}
//      → thông tin project
//
// GET  /api/projects/{projectId}/milestones
//      → danh sách milestone
//
// POST /api/disputes
//      → mở dispute mới
//
// POST /api/projects/{projectId}/continue-after-dispute
//      → Client chọn tiếp tục Project sau khi Expert thắng dispute
//
// POST /api/projects/{projectId}/end-after-dispute
//      → Client chọn kết thúc Contract sau khi Expert thắng dispute
//

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";
import { findExistingConversationWithExpert } from "../../../utils/conversation.util";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const STATUS_CONFIG = {
  ACTIVE:    { label: "Active",    color: "#facc15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)" },
  COMPLETED: { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.25)"  },
  DISPUTED:  { label: "Disputed",  color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
};

const MILESTONE_STATUS = {
  PENDING:   { label: "Pending",   color: "#8c90a0" },
  SUBMITTED: { label: "Submitted", color: "#facc15" },
  APPROVED:  { label: "Approved",  color: "#22c55e" },
  REJECTED:  { label: "Rejected",  color: "#f87171" },
};

const PROJECT_POLL_INTERVAL_MS = 15000;

const cardStyle = {
  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

// ── Open Dispute Modal ──────────────────────────────────────────────
function OpenDisputeModal({ project, milestone, onClose, onSubmitted }) {
  const [reason, setReason] = useState("");
  const disputedAmount =
  milestone?.amount ?? project?.totalAmount ?? "";
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState("");

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const respondentUserId =
    project?.expertUserId ??
    project?.expert?.userId ??
    project?.expert?.expertUserId ??
    project?.expertProfile?.userId ??
    project?.expertProfile?.expertUserId;

    const getFieldStyle = (fieldName) => ({
      border: `1px solid ${fieldErrors[fieldName] ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
    });

    const renderFieldError = (fieldName) => {
      if (!fieldErrors[fieldName]) return null;

      return (
        <p style={{ fontSize: 12, color: "#f87171", marginTop: 6, marginBottom: 0 }}>
          {fieldErrors[fieldName]}
        </p>
      );
    };

    const handleSelectImages = (files) => {
      if (!files?.length) return;

      const validFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (!validFiles.length) {
        setError("Please select valid image files.");
        return;
      }

      const previews = validFiles.map((file) =>
        URL.createObjectURL(file)
      );

      setImageFiles((prev) => [...prev, ...validFiles]);
      setImagePreviewUrls((prev) => [...prev, ...previews]);

      setFieldErrors((prev) => ({
        ...prev,
        imageFile: "",
      }));
    };

 

  const handleSubmit = async () => {
    const errors = {};

    if (!Number(project?.projectId ?? project?.id)) {
      errors.projectId = "Project is required.";
    }

    if (milestone && !Number(milestone.milestoneId ?? milestone.id)) {
      errors.milestoneId = "Milestone is required.";
    }

    if (!Number(respondentUserId)) {
      errors.respondentUserId = "Respondent expert is required.";
    }

    if (!disputedAmount || !Number(disputedAmount) || Number(disputedAmount) <= 0) {
      errors.disputedAmount = "Disputed amount must be greater than 0.";
    }

    if (!reason.trim()) {
      errors.reason = "Reason is required.";
    }

    if (!evidenceText.trim()) {
      errors.evidenceText = "Evidence description is required.";
    }

    

    if (
      !evidenceFileUrl.trim() &&
      imageFiles.length === 0
    ) {
      errors.imageFile =
        "Provide a proof link or upload at least one image.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please complete all required fields.");
      return;
    }

    setFieldErrors({});

    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();

      formData.append(
        "ProjectId",
        Number(project.projectId ?? project.id)
      );

      if (milestone) {
        formData.append(
          "MilestoneId",
          Number(milestone.milestoneId ?? milestone.id)
        );
      }

      formData.append(
        "RespondentUserId",
        Number(respondentUserId)
      );

      formData.append(
        "DisputedAmount",
        Number(disputedAmount) || 0
      );

      formData.append(
        "Reason",
        reason.trim()
      );

      formData.append(
        "EvidenceText",
        evidenceText.trim() || ""
      );

      formData.append(
        "EvidenceFileUrl",
        evidenceFileUrl || ""
      );

      imageFiles.forEach((file) => {
        formData.append("Images", file);
      });

      await axiosInstance.post(
        "/disputes",
        formData
      );

      onSubmitted();

      setTimeout(() => {
        onClose();
      }, 800);

    } catch (err) {
        setError(
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          "Complaint filed failed. Please try again."
        );
      }finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="scrollbar-none" style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 19, fontWeight: 700, color: "#f97316", margin: "0 0 4px" }}>Open Dispute</h3>
            <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>
              {milestone ? `Related to milestones: ${milestone.title || "Milestone"}` : "Complaint for the entire project"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>
              Amount in dispute (VND)
            </label>
            <input
              type="text"
              value={Number(disputedAmount || 0).toLocaleString()}
              readOnly
              style={{
                width: "100%",
                background: "#161a20",
                border: getFieldStyle("disputedAmount").border,
                borderRadius: 10,
                padding: "12px 14px",
                color: "#8c90a0",
                outline: "none",
                cursor: "not-allowed",
                boxSizing: "border-box",
              }}
            />
            {renderFieldError("disputedAmount")}
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>
              Reason for complaint <span style={{ color: "#f87171" }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFieldErrors((prev) => ({ ...prev, reason: "" }));
              }}
              rows={3}
              placeholder="Example: The delivered product does not meet the agreed-upon requirements..."
              style={{ width: "100%", background: "#1d2026", border: getFieldStyle("reason").border, borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box" }} />
              {renderFieldError("reason")}
          </div>

          

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>
              Evidence (further description)
            </label>
            <textarea
              value={evidenceText}
              onChange={(e) => {
                setEvidenceText(e.target.value);
                setFieldErrors((prev) => ({
                  ...prev,
                  evidenceText: "",
                }));
              }}
              rows={3}
              placeholder="Provide detailed evidence, including links to documents, screenshots of messages, etc."
              style={{ width: "100%", background: "#1d2026", border: getFieldStyle("evidenceText").border, borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box" }} />
              {renderFieldError("evidenceText")}
          </div>

          {/* Upload ảnh bằng chứng — chỉ hỗ trợ ảnh vì BE chỉ có /uploads/images */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#8c90a0",
                marginBottom: 8,
              }}
            >
              Proof link (optional)
            </label>

            <input
              type="url"
              value={evidenceFileUrl}
              onChange={(e) => {
                setEvidenceFileUrl(e.target.value);
                setFieldErrors((prev) => ({
                  ...prev,
                  evidenceFileUrl: "",
                }));
              }}
              placeholder="https://drive.google.com/... or https://example.com/file.pdf"
              style={{
                width: "100%",
                background: "#1d2026",
                border: getFieldStyle("evidenceFileUrl").border,
                borderRadius: 10,
                padding: "12px 14px",
                color: "#e1e2eb",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {renderFieldError("evidenceFileUrl")}
            <p
              style={{
                marginTop: 8,
                color: "#8c90a0",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Paste the Google Drive, Dropbox, OneDrive link
            </p>

            <p style={{ fontSize: 11, color: "#5b6470", marginTop: 6, marginBottom: 0 }}>
              Only images are supported. To attach other documents (PDF, video, etc.), paste the link into the "Proof" box above.
            </p>
          </div>


          <div>
            <label
              style={{
                display: "block",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#8c90a0",
                marginBottom: 8,
              }}
            >
              Evidence Image
            </label>

            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "#1d2026",
                  border: getFieldStyle("imageFile").border,
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    overflow: "hidden",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: "#00F0FF",
                      fontSize: 20,
                    }}
                  >
                    image
                  </span>

                  <span
                    style={{
                      color: imageFiles.length > 0 ? "#e1e2eb" : "#8c90a0",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "250px",
                    }}
                  >
                    {imageFiles.length > 0
                      ? `${imageFiles.length} image(s) selected`
                      : "Choose evidence images"}
                  </span>
                </div>

                <div
                  style={{
                    background: "rgba(0,240,255,0.12)",
                    border: "1px solid rgba(0,240,255,0.25)",
                    color: "#00F0FF",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Browse
                </div>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleSelectImages(
                      e.target.files
                    )
                  }
                />
              </label>

              {imageFiles.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16 }}
                  >
                    check_circle
                  </span>
                  Image selected successfully
                </div>
              )}

              {renderFieldError("imageFile")}

              {imagePreviewUrls.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {imagePreviewUrls.map((url, index) => (
                    <div
                      key={index}
                      style={{
                        position: "relative",
                      }}
                    >
                      <img
                        src={url}
                        alt={`Evidence ${index + 1}`}
                        onClick={() => {
                          setPreviewImageUrl(url);
                          setPreviewOpen(true);
                        }}
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.12)",
                          cursor: "zoom-in",
                          transition: "transform 0.2s ease, border-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.04)";
                          e.currentTarget.style.borderColor = "rgba(0,240,255,0.55)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = [...imageFiles];
                          const newPreviews = [...imagePreviewUrls];

                          newFiles.splice(index, 1);
                          newPreviews.splice(index, 1);

                          setImageFiles(newFiles);
                          setImagePreviewUrls(newPreviews);
                        }}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(0,0,0,0.75)",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{error}</div>
          )}

                    <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
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
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 2,
                padding: "12px",
                background: submitting ? "#1d2026" : "#f97316",
                color: submitting ? "#8c90a0" : "#1a0a00",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {submitting ? (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 16,
                      animation: "spin 1s linear infinite",
                    }}
                  >
                    autorenew
                  </span>
                  Sending...
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16 }}
                  >
                    gavel
                  </span>
                  Submit a complaint
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Popup xem ảnh bằng chứng kích thước lớn */}
      {previewOpen && previewImageUrl && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setPreviewOpen(false);
            setPreviewImageUrl("");
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(0,0,0,0.9)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            boxSizing: "border-box",
            cursor: "zoom-out",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewOpen(false);
              setPreviewImageUrl("");
            }}
            style={{
              position: "fixed",
              top: 20,
              right: 24,
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(0,0,0,0.7)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2001,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 24 }}
            >
              close
            </span>
          </button>

          <img
            src={previewImageUrl}
            alt="Evidence preview"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "block",
              maxWidth: "95vw",
              maxHeight: "90vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 20px 70px rgba(0,0,0,0.8)",
              cursor: "default",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function ClientProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const proposalId =
  project?.proposalId ||
  project?.latestProposalId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [disputeModal, setDisputeModal] = useState(null); // { milestone } | { milestone: null } khi mở cho cả project
  // bannerMsg dùng chung cho mọi thông báo thành công cần hiện khi quay lại trang
  // này — ví dụ sau khi vừa approve 1 deliverable ở MilestoneDeliverablesPage và
  // navigate về đây kèm state.successMsg, hoặc sau khi vừa mở dispute thành công.
  const [bannerMsg, setBannerMsg] = useState(location.state?.successMsg || "");
  const [postDisputeActionLoading, setPostDisputeActionLoading] = useState("");
  const [postDisputeActionError, setPostDisputeActionError] = useState("");

  const fetchData = useCallback(async (signal, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const res = await axiosInstance.get(`/projects/${projectId}`, { signal });
      const projectData = res.data?.data ?? res.data;
      setProject(projectData);

      try {
        const msRes = await axiosInstance.get(`/projects/${projectId}/milestones`, { signal });
        const msRaw = msRes.data?.data ?? msRes.data;
        setMilestones(Array.isArray(msRaw) ? msRaw : msRaw?.items ?? []);
      } catch {
        setMilestones([]);
      }
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;

      if (!silent) {
        setError(err?.response?.data?.message || "Unable to load project information.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  useEffect(() => {
    const currentStatus = String(project?.status ?? "").toUpperCase();

    const shouldPoll =
      ["ACTIVE", "DISPUTED"].includes(currentStatus) ||
      Boolean(project?.requiresPostDisputeDecision);

    if (!shouldPoll) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchData(undefined, true);
    }, PROJECT_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [
    fetchData,
    project?.status,
    project?.requiresPostDisputeDecision,
  ]);

  useEffect(() => {
  const currentStatus = String(project?.status ?? "").toUpperCase();

  if (
    currentStatus === "COMPLETED" &&
    !project?.requiresPostDisputeDecision &&
    location.state?.successMsg !== "Review submitted successfully."
  ) {
    navigate(`/client/projects/${projectId}/review`, {
      replace: true,
    });
  }
}, [
  project?.status,
  project?.requiresPostDisputeDecision,
  projectId,
  navigate,
  location.state,
]);

  const showFullLoading = loading && !project;

  if (showFullLoading) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading project...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  if (error && !project) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 24px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
          <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error}</p>
          <button onClick={() => navigate("/client/projects")}
            style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
            Back to list
          </button>
        </div>
      </ClientLayout>
    );
  }

if (!project) return null;

  const normalizedProjectStatus = String(project.status ?? "").toUpperCase();

  const statusCfg =
    STATUS_CONFIG[normalizedProjectStatus] ||
    STATUS_CONFIG.ACTIVE;

  const requiresPostDisputeDecision =
    Boolean(project?.requiresPostDisputeDecision) &&
    Boolean(projectId);

  const expertName = project.expertName || project.expert?.fullName || "Expert";
  const startDate = project.startDate || project.createdAt
    ? new Date(project.startDate || project.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  // Milestone "đang làm" = milestone đầu tiên chưa APPROVED.
  const currentMilestoneIndex = milestones.findIndex(
    (m) => String(m.status ?? "").toUpperCase() !== "APPROVED"
  );
  const currentMilestone = currentMilestoneIndex >= 0 ? milestones[currentMilestoneIndex] : null;

  const handleContinueAfterDispute = async () => {
    if (!projectId || postDisputeActionLoading) {
      return;
    }

    setPostDisputeActionLoading("continue");
    setPostDisputeActionError("");

    try {
      await axiosInstance.post(
        `/projects/${projectId}/continue-after-dispute`
      );

      setBannerMsg("Project continued successfully.");
      await fetchData(undefined, true);
    } catch (err) {
      setPostDisputeActionError(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Continue project failed."
      );
    } finally {
      setPostDisputeActionLoading("");
    }
  };

  const handleEndAfterDispute = async () => {
    if (!projectId || postDisputeActionLoading) {
      return;
    }

    setPostDisputeActionLoading("end");
    setPostDisputeActionError("");

    try {
      await axiosInstance.post(
        `/projects/${projectId}/end-after-dispute`
      );

      navigate("/client/projects?status=CANCELLED", {
        state: {
          successMsg: "Contract ended successfully.",
        },
      });
    } catch (err) {
      setPostDisputeActionError(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "End contract failed."
      );
    } finally {
      setPostDisputeActionLoading("");
    }
  };

  return (
    <ClientLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        {/* Back */}
        <button onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back 
        </button>

        {/* Header card */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 24, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
              {project.title || project.jobTitle}
            </h1>
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>
              {statusCfg.label}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#8c90a0", margin: "0 0 20px" }}>Started {startDate}</p>

          {/* Expert info */}
          <div style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <img
                src={
                  project.expertAvatarUrl ||
                  `https://i.pravatar.cc/80?u=${project.expertProfileId || project.expertUserId || project.projectId}`
                }
                alt={expertName}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,240,255,0.25)" }}
              />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#e1e2eb", margin: "0 0 2px", fontFamily: "Hanken Grotesk, sans-serif" }}>{expertName}</p>
              <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>{project.expertTitle || "AI Expert"}</p>
            </div>

            <button onClick={async () => {
              if (project.conversationId) {
                navigate(`/client/messages/${project.conversationId}`);
                return;
              }
              // project.conversationId không có sẵn — tìm theo expertUserId
              // trước khi coi như chưa từng nhắn tin với expert này.
              const expertUserId = project.expertUserId ?? project.expert?.userId;
              try {
                const existing = expertUserId != null
                  ? await findExistingConversationWithExpert(axiosInstance, { expertUserId })
                  : null;
                navigate(existing?.conversationId ? `/client/messages/${existing.conversationId}` : "/client/messages");
              } catch {
                navigate("/client/messages");
              }
            }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(192,193,255,0.08)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
              Message
            </button>

            <button
              onClick={() =>
                navigate(
                  `/client/projects/${projectId}/contract?proposalId=${proposalId}`
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                background: "rgba(34,197,94,0.12)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                description
              </span>
              Contract Detail
            </button>

            {normalizedProjectStatus === "COMPLETED" &&
              !requiresPostDisputeDecision && (
              <button onClick={() => navigate(`/client/projects/${projectId}/review`)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>star</span>
                Leave Review
              </button>
            )}

            {(normalizedProjectStatus === "DISPUTED" ||
            requiresPostDisputeDecision) && (
            <button
              onClick={() => navigate(`/client/disputes?projectId=${projectId}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                background: requiresPostDisputeDecision
                  ? "rgba(0,240,255,0.08)"
                  : "rgba(249,115,22,0.08)",
                color: requiresPostDisputeDecision
                  ? "#00F0FF"
                  : "#f97316",
                border: requiresPostDisputeDecision
                  ? "1px solid rgba(0,240,255,0.25)"
                  : "1px solid rgba(249,115,22,0.25)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {requiresPostDisputeDecision ? "rule" : "gavel"}
              </span>
              {requiresPostDisputeDecision
                ? "Resolve Decision"
                : "View Dispute"}
            </button>
          )}
          </div>
        </div>

        {bannerMsg && (
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            {bannerMsg}
          </div>
        )}

        {requiresPostDisputeDecision && (
        <div
          style={{
            ...cardStyle,
            marginBottom: 20,
            border: "1px solid rgba(0,240,255,0.22)",
            background: "rgba(0,240,255,0.03)",
          }}
        >
          <h3
            style={{
              fontFamily: "Hanken Grotesk, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#00F0FF",
              marginBottom: 10,
            }}
          >
            Project Decision Required
          </h3>

          <p
            style={{
              fontSize: 13,
              color: "#c2c6d6",
              lineHeight: 1.7,
              margin: "0 0 16px",
            }}
          >
            The latest dispute was resolved in favor of the Expert. Please choose
            whether you want to continue the project or end the contract.
          </p>

          {postDisputeActionError && (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#f87171",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {postDisputeActionError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleContinueAfterDispute}
              disabled={Boolean(postDisputeActionLoading)}
              style={{
                padding: "10px 18px",
                background: "#00F0FF",
                color: "#002022",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: postDisputeActionLoading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {postDisputeActionLoading === "continue"
                ? "Continuing..."
                : "Continue Project"}
            </button>

            <button
              type="button"
              onClick={handleEndAfterDispute}
              disabled={Boolean(postDisputeActionLoading)}
              style={{
                padding: "10px 18px",
                background: "rgba(239,68,68,0.12)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.35)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: postDisputeActionLoading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {postDisputeActionLoading === "end"
                ? "Ending..."
                : "End Contract"}
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(`/client/disputes?projectId=${projectId}`)
              }
              style={{
                padding: "10px 18px",
                background: "rgba(249,115,22,0.08)",
                color: "#f97316",
                border: "1px solid rgba(249,115,22,0.25)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              View Dispute
            </button>
          </div>
        </div>
      )}

        {/* Banner milestone hiện tại — chỉ có ý nghĩa khi project còn ACTIVE */}
        {normalizedProjectStatus === "ACTIVE" && currentMilestone && (
          <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(250,204,21,0.25)", background: "rgba(250,204,21,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#facc15" }}>flag</span>
                <div>
                  <p style={{ fontSize: 11, color: "#8c90a0", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px", fontFamily: "JetBrains Mono, monospace" }}>
                    Expert is working on it.
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
                    {currentMilestone.title || `Milestone ${currentMilestoneIndex + 1}`}
                  </p>
                </div>
              </div>
              <span style={{ padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "#facc15", background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.3)" }}>
                {currentMilestoneIndex + 1} / {milestones.length}
              </span>
            </div>

            {milestones.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 4 }}>
                {milestones.map((m, i) => {
                  const done =
                    String(m.status ?? "").toUpperCase() === "APPROVED";
                  const active = i === currentMilestoneIndex;
                  return (
                    <div key={m.milestoneId ?? i} style={{ flex: 1, height: 6, borderRadius: 3, background: done ? "#22c55e" : active ? "#facc15" : "rgba(255,255,255,0.08)" }} />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Milestone list */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            Milestones
          </h3>

          {milestones.length === 0 ? (
            <p style={{ fontSize: 14, color: "#8c90a0", textAlign: "center", padding: "24px 0" }}>No milestones have been created yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {milestones.map((m, index) => {
                const normalizedStatus = String(m.status || "").toUpperCase();
                const mCfg = MILESTONE_STATUS[normalizedStatus] || MILESTONE_STATUS.PENDING;
                const isCurrent = index === currentMilestoneIndex;

                const canOpenDeliverable = ["SUBMITTED", "APPROVED", "REJECTED"].includes(
                  normalizedStatus
                );

                const deliverableButtonLabel =
                  normalizedStatus === "SUBMITTED" ? "Preview" : "View";

                return (
                  <div key={m.milestoneId ?? index}
                    style={{ background: isCurrent ? "rgba(250,204,21,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${isCurrent ? "rgba(250,204,21,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCurrent && <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#facc15" }}>arrow_right</span>}
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#e1e2eb", margin: "0 0 4px" }}>
                          {m.title || `Milestone ${index + 1}`}
                        </p>
                      </div>
                      {m.description && (
                        <p style={{ fontSize: 13, color: "#8c90a0", margin: 0 }}>{m.description}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {m.amount != null && (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#00F0FF", fontWeight: 700 }}>
                          {formatCurrency(m.amount)}
                        </span>
                      )}
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: mCfg.color, background: mCfg.color + "15", border: `1px solid ${mCfg.color}40` }}>
                        {mCfg.label}
                      </span>
                      {canOpenDeliverable && (
                        <button onClick={() => navigate(`/client/milestones/${m.milestoneId}/deliverables`)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(192,193,255,0.1)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
                          {deliverableButtonLabel}
                        </button>
                      )}

                      {/* Open Dispute gắn theo milestone — chỉ khi project còn ACTIVE
                       và milestone ở trạng thái SUBMITTED hoặc REJECTED. */}
                      {normalizedProjectStatus === "ACTIVE" &&
                        !requiresPostDisputeDecision &&
                        ["SUBMITTED", "REJECTED"].includes(normalizedStatus) && (
                          <button
                            onClick={() => setDisputeModal({ milestone: m })}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "6px 12px",
                              background: "rgba(249,115,22,0.08)",
                              color: "#f97316",
                              border: "1px solid rgba(249,115,22,0.25)",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 14 }}
                            >
                              gavel
                            </span>
                            Dispute
                          </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {disputeModal && (
        <OpenDisputeModal
          project={project}
          milestone={disputeModal.milestone}
          onClose={() => setDisputeModal(null)}
          onSubmitted={() => {
            setBannerMsg("The complaint has been submitted. The administrator will review it and respond as soon as possible.");
            fetchData(undefined, true); // cập nhật status/milestones ngay, không cần đợi vòng poll tiếp theo
          }}
        />
      )}

      <style>{`
        .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </ClientLayout>
  );
}