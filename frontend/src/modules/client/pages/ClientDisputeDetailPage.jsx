// src/modules/client/pages/DisputeDetailPage.jsx
//
// GET  /api/disputes/me                      → list dispute của Client hiện tại
// GET  /api/disputes/{disputeId}              → chi tiết 1 dispute
// POST /api/disputes/{disputeId}/evidences    → bổ sung bằng chứng { evidenceText, fileUrl }
//
// LƯU Ý: chưa test được response thật của GET /disputes/{disputeId} (chưa có dispute
// nào được tạo để thử). Field dưới đây dựa trên request schema đã xác nhận
// (OpenDisputeRequest: projectId, milestoneId, respondentUserId, disputedAmount, reason,
// evidenceText, evidenceFileUrl) cộng thêm các field suy luận hợp lý cho 1 response
// dispute (disputeId, status, createdAt, resolution, resolvedAt, evidences[]).
// Khi có response thật, kiểm tra lại toàn bộ field trong unwrap bên dưới.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

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

const DISPUTE_STATUS = {
  OPEN:        { label: "Open",        color: "#f97316" },
  PENDING:     { label: "Pending Review", color: "#facc15" },
  UNDER_REVIEW:{ label: "Under Review", color: "#facc15" },
  RESOLVED:    { label: "Resolved",    color: "#22c55e" },
  REJECTED:    { label: "Rejected",    color: "#8c90a0" },
  CLOSED:      { label: "Closed",      color: "#8c90a0" },
};

export default function ClientDisputeDetailPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const navigate = useNavigate();

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState("");
  const [evidenceImageUrls, setEvidenceImageUrls] = useState([]);
  const [evidencePreviewUrls, setEvidencePreviewUrls] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadImageError, setUploadImageError] = useState("");
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceSent, setEvidenceSent] = useState(false);
const [previewImageUrl, setPreviewImageUrl] = useState("");

const normalizedDisputeStatus = String(
  dispute?.status ?? ""
).toUpperCase();

const isClosed = [
  "RESOLVED",
  "REJECTED",
  "CLOSED",
].includes(normalizedDisputeStatus);

const normalizedEvidenceText = evidenceText.trim();
const normalizedEvidenceFileUrl = evidenceFileUrl.trim();

const hasEvidenceText = normalizedEvidenceText.length > 0;

const hasEvidenceAttachment =
  normalizedEvidenceFileUrl.length > 0 ||
  evidenceImageUrls.length > 0;

const isValidEvidenceFileUrl = (() => {
  if (!normalizedEvidenceFileUrl) {
    return true;
  }

  try {
    const url = new URL(normalizedEvidenceFileUrl);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
})();

const canSubmitEvidence =
  !isClosed &&
  Boolean(dispute?.disputeId) &&
  hasEvidenceText &&
  hasEvidenceAttachment &&
  isValidEvidenceFileUrl &&
  !uploadingImage &&
  !submittingEvidence &&
  !evidenceSent;

  

  // Tìm dispute đúng theo projectId truyền qua query param — vì hiện tại điều hướng
  // tới trang này chỉ biết projectId (không biết sẵn disputeId), nên phải lấy list
  // GET /disputes/me rồi lọc ra đúng dispute khớp projectId.
  // code mới
  const fetchDispute = useCallback(async (signal, silent = false) => {
  if (!silent) {
    setLoading(true);
    setError("");
  }

  try {
    const res = await axiosInstance.get("/disputes/me", { signal });

    if (signal?.aborted) return;

    const raw = res.data?.data ?? res.data;
    const list = Array.isArray(raw) ? raw : raw?.items ?? [];

    const match = projectId
      ? list.find((d) => String(d.projectId) === String(projectId))
      : list[0];

    if (!match) {
      if (!silent) {
        setError("No complaints were found for this project.");
      }
      return;
    }

    const detailRes = await axiosInstance.get(
      `/disputes/${match.disputeId}`,
      { signal }
    );

    if (signal?.aborted) return;

    const detail = detailRes.data?.data ?? detailRes.data;

    setDispute(detail ?? match);
    setError("");
  } catch (err) {
    if (
      err?.code === "ERR_CANCELED" ||
      err?.name === "CanceledError" ||
      signal?.aborted
    ) {
      return;
    }

    if (!silent) {
      setError(
        err?.response?.data?.message ||
        "Unable to load complaint information."
      );
    }
  } finally {
    // Không tắt loading đối với request đã bị hủy
    if (!silent && !signal?.aborted) {
      setLoading(false);
    }
  }
}, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDispute(controller.signal);
    return () => controller.abort();
  }, [fetchDispute]);

  // Tự động làm mới dispute mỗi 5s khi chưa CLOSED — để phát hiện khi Admin
  // xử lý xong (Resolved/Rejected) mà không cần Client tự F5.
  useEffect(() => {
    if (!dispute) return;
    const isClosed = ["RESOLVED", "REJECTED", "CLOSED"].includes(dispute.status);
    if (isClosed) return;

    const intervalId = setInterval(() => {
      fetchDispute(undefined, true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [dispute?.status, fetchDispute]);

  
  const handleUploadEvidenceImages = async (files) => {
  const selectedFiles = Array.from(files || []).filter((file) =>
    file.type.startsWith("image/")
  );

  if (selectedFiles.length === 0) {
    setUploadImageError("Please select valid image files.");
    return;
  }

  setUploadingImage(true);
  setUploadImageError("");

  try {
    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
      setEvidencePreviewUrls((prev) => [...prev, ...previewUrls]);

      const uploadedUrls = [];

      for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axiosInstance.post("/uploads/images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const raw = res.data?.data ?? res.data;

      const imageUrl =
        typeof raw === "string"
          ? raw
          : raw?.url ||
            raw?.fileUrl ||
            raw?.imageUrl ||
            raw?.secureUrl ||
            raw?.secure_url ||
            raw?.path ||
            raw?.image?.url ||
            raw?.image?.fileUrl ||
            raw?.image?.imageUrl ||
            raw?.data?.url ||
            raw?.data?.fileUrl ||
            raw?.data?.imageUrl ||
            raw?.data?.secureUrl ||
            raw?.data?.secure_url ||
            raw?.data?.image?.url ||
            "";

      if (imageUrl) {
        uploadedUrls.push(String(imageUrl));
      } else {
        throw new Error("Upload image API did not return image URL.");
      }
    }

    setEvidenceImageUrls((prev) => [...prev, ...uploadedUrls]);
  } catch (err) {
    setUploadImageError(
      err?.message ||
      err?.response?.data?.message ||
      "Image upload failed. Please try again."
    );
  } finally {
    setUploadingImage(false);
  }
};

  const handleAddEvidence = async () => {
  if (!canSubmitEvidence) {
    if (!hasEvidenceText) {
      setEvidenceError(
        "Evidence description is required."
      );
    } else if (!hasEvidenceAttachment) {
      setEvidenceError(
        "Provide a proof link or upload at least one image."
      );
    } else if (!isValidEvidenceFileUrl) {
      setEvidenceError(
        "Evidence link must be a valid HTTP or HTTPS URL."
      );
    }

    return;
  }

  setSubmittingEvidence(true);
  setEvidenceError("");

  try {
    await axiosInstance.post(
      `/disputes/${dispute.disputeId}/evidences`,
      {
        evidenceText: normalizedEvidenceText,
        fileUrl: normalizedEvidenceFileUrl || null,

        // Không truyền URL thường vào imageUrl.
        // Ảnh đã upload được gửi trong imageUrls.
        imageUrl: null,
        imageUrls: evidenceImageUrls,
      }
    );

    // API detail trả toàn bộ dispute và evidences.
    await fetchDispute(undefined, true);

    evidencePreviewUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    setEvidenceSent(true);
    setEvidenceText("");
    setEvidenceFileUrl("");
    setEvidenceImageUrls([]);
    setEvidencePreviewUrls([]);
    setUploadImageError("");

    setTimeout(() => {
      setEvidenceSent(false);
    }, 3000);
  } catch (err) {
    setEvidenceError(
      err?.response?.data?.message ||
      err?.response?.data?.title ||
      "Submit evidence failed."
    );
  } finally {
    setSubmittingEvidence(false);
  }
};

  if (loading) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading dispute...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  if (error || !dispute) {
  return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 24px" }}>
        <p
          style={{
            color: "#8c90a0",
            fontSize: 15,
            marginBottom: 20,
          }}
        >
          Complaint information is currently unavailable.
        </p>

        <button
          onClick={() => navigate("/client/projects")}
          style={{
            padding: "10px 24px",
            background: "#00F0FF",
            color: "#002022",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Back to Projects
        </button>
      </div>
    </ClientLayout>
  );
}

  const dStatus =
  DISPUTE_STATUS[normalizedDisputeStatus] ||
  DISPUTE_STATUS.OPEN;
  const createdAt = dispute.createdAt ? new Date(dispute.createdAt).toLocaleString("vi-VN") : "—";
  const resolvedAt = dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleString("vi-VN") : null;
  const evidences = Array.isArray(dispute.evidences)
    ? dispute.evidences
    : [];

  const getImageUrl = (image) => {
    if (!image) return "";

    if (typeof image === "string") {
      return image;
    }

    return (
      image.url ||
      image.imageUrl ||
      image.fileUrl ||
      image.path ||
      ""
    );
  };

  const getEvidenceImages = (evidence) => {
    return Array.from(
      new Set(
        [
          evidence?.imageUrl,
          ...(Array.isArray(evidence?.imageUrls)
            ? evidence.imageUrls
            : []),
          ...(Array.isArray(evidence?.images)
            ? evidence.images
            : []),
        ]
          .map(getImageUrl)
          .filter(Boolean)
      )
    );
  };

  const groupedEvidences = Object.values(
  evidences.reduce((groups, evidence, index) => {
    const evidenceCreatedAt = evidence?.createdAt
      ? new Date(evidence.createdAt)
      : null;

    const createdAtKey =
      evidenceCreatedAt &&
      !Number.isNaN(evidenceCreatedAt.getTime())
        ? evidenceCreatedAt.toISOString().slice(0, 19)
        : `unknown-${index}`;

    /*
     * Ưu tiên submissionId khi Backend bổ sung.
     *
     * Backend hiện tại tách mỗi ảnh thành một evidence record
     * và chưa trả submissionId. Fallback dựa trên dữ liệu thật:
     * cùng người gửi + cùng nội dung + cùng giây
     * được xem là cùng một lần submit.
     */
    const groupKey =
      evidence?.evidenceSubmissionId ||
      evidence?.submissionId ||
      evidence?.batchId ||
      [
        evidence?.uploadedByUserId ?? "",
        evidence?.evidenceText?.trim() || "",
        createdAtKey,
      ].join("|");

    if (!groups[groupKey]) {
      groups[groupKey] = {
        key: String(groupKey),
        evidenceIds: [],
        evidenceText: evidence?.evidenceText || "",
        uploadedByUserId:
          evidence?.uploadedByUserId ?? null,
        uploadedByName:
          evidence?.uploadedByName || "",
        fileUrls: [],
        imageUrls: [],
        createdAt: evidence?.createdAt || null,
      };
    }

    if (evidence?.evidenceId != null) {
      groups[groupKey].evidenceIds.push(
        evidence.evidenceId
      );
    }

    if (evidence?.fileUrl) {
      groups[groupKey].fileUrls.push(
        evidence.fileUrl
      );
    }

    if (Array.isArray(evidence?.fileUrls)) {
      groups[groupKey].fileUrls.push(
        ...evidence.fileUrls
      );
    }

    groups[groupKey].imageUrls.push(
      ...getEvidenceImages(evidence)
    );

    groups[groupKey].fileUrls = Array.from(
      new Set(
        groups[groupKey].fileUrls.filter(Boolean)
      )
    );

    groups[groupKey].imageUrls = Array.from(
      new Set(
        groups[groupKey].imageUrls.filter(Boolean)
      )
    );

    return groups;
  }, {})
).sort((a, b) => {
  const timeA = a.createdAt
    ? new Date(a.createdAt).getTime()
    : 0;

  const timeB = b.createdAt
    ? new Date(b.createdAt).getTime()
    : 0;

  return timeA - timeB;
});

  return (
    <ClientLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

        <button onClick={() => navigate(projectId ? `/client/projects/${projectId}` : "/client/projects")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Project
        </button>

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(249,115,22,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: "#8c90a0", margin: "0 0 4px" }}>
                {dispute.projectTitle || "Project Dispute"}
              </p>

              <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "#f97316", margin: 0 }}>
                Dispute Detail
              </h1>
            </div>
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: dStatus.color, background: dStatus.color + "15", border: `1px solid ${dStatus.color}40`, whiteSpace: "nowrap" }}>
              {dStatus.label}
            </span>
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <span style={sectionLabel}>Disputed Amount</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#f97316" }}>
                ${Number(dispute.disputedAmount ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Opened</span>
              <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>{createdAt}</div>
            </div>
            {dispute.milestoneTitle && (
              <div>
                <span style={sectionLabel}>Milestone</span>
                <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>
                  {dispute.milestoneTitle}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reason */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            Reason
          </h3>
          <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
            {dispute.reason || "—"}
          </p>
        </div>

        {/* Initial evidence text */}
        {(dispute.evidenceText ||
          dispute.evidenceFileUrl ||
          dispute.evidenceImageUrl ||
          dispute.images?.length > 0) && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Initial Evidence
            </h3>

            {dispute.evidenceText && (
              <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: "0 0 12px" }}>
                {dispute.evidenceText}
              </p>
            )}

            {dispute.evidenceFileUrl && (
              <a
                href={dispute.evidenceFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#00F0FF", display: "inline-block", marginBottom: 12 }}
              >
                Open proof link
              </a>
            )}

            {dispute.evidenceImageUrl && (
              <img
                src={dispute.evidenceImageUrl}
                alt="Evidence"
                onClick={() =>
                  setPreviewImageUrl(dispute.evidenceImageUrl)
                }
                style={{
                  width: 160,
                  height: 160,
                  objectFit: "cover",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "block",
                  marginTop: 12,
                  cursor: "zoom-in",
                }}
              />
            )}

            {Array.isArray(dispute.images) && dispute.images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                {dispute.images.map((img, index) => {
                  const imageUrl =
                    typeof img === "string"
                      ? img
                      : img.url || img.imageUrl || img.fileUrl || img.path;

                  if (!imageUrl) return null;

                  return (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`Evidence ${index + 1}`}
                      style={{
                        width: 140,
                        height: 140,
                        objectFit: "cover",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mỗi lần submit evidence hiển thị thành một field riêng */}
        {groupedEvidences.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3
              style={{
                fontFamily: "Hanken Grotesk, sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: "#e1e2eb",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Additional Evidence
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {groupedEvidences.map((group, groupIndex) => (
                <div
                  key={group.key}
                  style={{
                    padding: "16px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#8c90a0",
                      }}
                    >
                      {groupIndex === 0
                        ? "Initial Evidence"
                        : `Evidence Submission ${groupIndex}`}
                    </span>

                    {group.createdAt && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#5b6470",
                        }}
                      >
                        {new Date(group.createdAt).toLocaleString(
                          "vi-VN"
                        )}
                      </span>
                    )}
                  </div>

                  {group.evidenceText && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#c2c6d6",
                        lineHeight: 1.7,
                        margin: 0,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {group.evidenceText}
                    </p>
                  )}

                  {group.fileUrls.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: group.evidenceText ? 12 : 0,
                      }}
                    >
                      {group.fileUrls.map((url, index) => (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "block",
                            padding: "9px 11px",
                            background: "rgba(0,240,255,0.06)",
                            border:
                              "1px solid rgba(0,240,255,0.15)",
                            borderRadius: 8,
                            color: "#00F0FF",
                            fontSize: 12,
                            textDecoration: "none",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          🔗 {url}
                        </a>
                      ))}
                    </div>
                  )}

                  {group.imageUrls.length > 0 && (
                    <div
                      style={{
                        marginTop:
                          group.evidenceText ||
                          group.fileUrls.length > 0
                            ? 12
                            : 0,
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontFamily:
                            "JetBrains Mono, monospace",
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#8c90a0",
                          marginBottom: 8,
                        }}
                      >
                        Images ({group.imageUrls.length})
                      </span>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        {group.imageUrls.map((url, index) => (
                          <img
                            key={`${url}-${index}`}
                            src={url}
                            alt={`Evidence ${index + 1}`}
                            onClick={() =>
                              setPreviewImageUrl(url)
                            }
                            style={{
                              width: 140,
                              height: 140,
                              objectFit: "cover",
                              borderRadius: 10,
                              border:
                                "1px solid rgba(255,255,255,0.12)",
                              cursor: "zoom-in",
                              transition:
                                "transform 0.2s ease, border-color 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform =
                                "scale(1.04)";
                              e.currentTarget.style.borderColor =
                                "rgba(0,240,255,0.55)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform =
                                "scale(1)";
                              e.currentTarget.style.borderColor =
                                "rgba(255,255,255,0.12)";
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolution — chỉ hiện khi Admin đã xử lý xong */}
        {isClosed && (
          <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.02)" }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#22c55e", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(34,197,94,0.1)" }}>
              Resolution
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: "0 0 8px" }}>
              {dispute.resolution || dispute.resolutionNote || "Dispute has been resolved."}
            </p>
            {resolvedAt && (
              <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>Resolved at: {resolvedAt}</p>
            )}
          </div>
        )}

        {/* Add evidence — chỉ cho phép khi dispute còn đang mở */}
        {!isClosed && (
          <div style={cardStyle}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Add More Evidence
            </h3>
            <textarea
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              rows={4}
              placeholder="Evidence text / description..."
              style={{
                width: "100%",
                background: "#1d2026",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "12px 14px",
                color: "#e1e2eb",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                resize: "none",
                boxSizing: "border-box",
                marginBottom: 12,
              }}
            />

            <input
              value={evidenceFileUrl}
              onChange={(e) => setEvidenceFileUrl(e.target.value)}
              placeholder="Evidence file/link URL..."
              style={{
                width: "100%",
                background: "#1d2026",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "12px 14px",
                color: "#e1e2eb",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                boxSizing: "border-box",
                marginBottom: 12,
              }}
            />

            {/* Upload ảnh bổ sung — chỉ hỗ trợ ảnh vì BE chỉ có /uploads/images */}
            <div style={{ marginBottom: 12 }}>
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
                Evidence Images
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "#1d2026",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: uploadingImage ? "not-allowed" : "pointer",
                }}
              >
                <span style={{ color: "#8c90a0", fontSize: 13 }}>
                  {uploadingImage
                    ? "Uploading image..."
                    : evidenceImageUrls.length > 0
                      ? `${evidenceImageUrls.length} image(s) uploaded`
                      : "Choose evidence images"}
                </span>

                <span
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
                </span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImage}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    handleUploadEvidenceImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>

              {uploadImageError && (
                <p style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>
                  {uploadImageError}
                </p>
              )}

              {evidencePreviewUrls.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {evidencePreviewUrls.map((url, index) => (
                    <div key={url} style={{ position: "relative" }}>
                      <img
                        src={url}
                        alt={`Evidence preview ${index + 1}`}
                        onClick={() => setPreviewImageUrl(url)}
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.12)",
                          cursor: "zoom-in",
                          transition:
                            "transform 0.2s ease, border-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.04)";
                          e.currentTarget.style.borderColor =
                            "rgba(0,240,255,0.55)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.borderColor =
                            "rgba(255,255,255,0.12)";
                        }}
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                        e.stopPropagation();

                        setEvidencePreviewUrls((prev) =>
                          prev.filter((_, i) => i !== index)
                        );

                        setEvidenceImageUrls((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
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

            {evidenceError && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{evidenceError}</div>
            )}

            <button
              onClick={handleAddEvidence}
              disabled={!canSubmitEvidence}
              style={{
                      padding: "11px 22px",

                      background: evidenceSent
                        ? "#22c55e"
                        : canSubmitEvidence
                          ? "#00F0FF"
                          : "rgba(0,240,255,0.08)",

                      color: evidenceSent
                        ? "#002022"
                        : canSubmitEvidence
                          ? "#002022"
                          : "#8c90a0",

                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 700,

                      cursor: canSubmitEvidence
                        ? "pointer"
                        : "not-allowed",

                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {evidenceSent ? "check_circle" : submittingEvidence ? "hourglass_empty" : "upload_file"}
              </span>
              {evidenceSent ? "Sent!" : submittingEvidence ? "Sending..." : "Submit Evidence"}
            </button>
          </div>
        )}

            </div>

      {/* Popup xem ảnh lớn, dùng chung cho ảnh đã nộp và chưa nộp */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl("")}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "rgba(0,0,0,0.92)",
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
              setPreviewImageUrl("");
            }}
            style={{
              position: "fixed",
              top: 20,
              right: 24,
              width: 42,
              height: 42,
              borderRadius: "50%",
              border:
                "1px solid rgba(255,255,255,0.25)",
              background: "rgba(0,0,0,0.7)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 3001,
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
              border:
                "1px solid rgba(255,255,255,0.15)",
              boxShadow:
                "0 20px 70px rgba(0,0,0,0.8)",
              cursor: "default",
            }}
          />
        </div>
      )}
    </ClientLayout>
  );
}