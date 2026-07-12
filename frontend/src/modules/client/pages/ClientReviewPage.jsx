// src/modules/client/pages/ClientReviewPage.jsx
// POST /api/projects/{projectId}/reviews  { rating, comment }
// GET  /api/projects/{projectId}/review   ← check đã review chưa

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

function StarRating({ value, onChange, readonly }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || value);
          return (
            <button
              key={star}
              type="button"
              disabled={readonly}
              onClick={() => !readonly && onChange(star)}
              onMouseEnter={() => !readonly && setHovered(star)}
              onMouseLeave={() => !readonly && setHovered(0)}
              style={{
                background: "none", border: "none", cursor: readonly ? "default" : "pointer",
                padding: 4, transition: "transform 0.15s",
                transform: filled && !readonly ? "scale(1.15)" : "scale(1)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 40,
                  color: filled ? "#facc15" : "#2d3038",
                  fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
                  filter: filled ? "drop-shadow(0 0 6px rgba(250,204,21,0.5))" : "none",
                  transition: "all 0.15s",
                }}
              >
                star
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ClientReviewPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // ── Check đã review chưa ──────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    axiosInstance.get(`/projects/${projectId}/review`, { signal: controller.signal })
      .then((res) => {
        setExistingReview(res.data);
        // Prefill nếu đã review
        if (res.data) {
          setRating(res.data.rating ?? 0);
          setComment(res.data.comment ?? "");
        }
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED") return;
        // 404 = chưa review → bình thường
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [projectId]);

  // ── Submit review ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a star rating."); return; }
    if (!comment.trim()) { setError("Please enter your review."); return; }
    if (comment.trim().length < 10) { setError("Review is too short (minimum 10 characters)."); return; }

    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.post(`/projects/${projectId}/reviews`, {
        rating,
        comment: comment.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Submit review failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  // ── Submitted success ─────────────────────────────────────────────
  if (submitted) return (
    <ClientLayout>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#22c55e", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "#e1e2eb", marginBottom: 12 }}>
          Review Submitted!
        </h1>
        <p style={{ color: "#8c90a0", fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
          Thank you for your review. Your feedback helps us improve service quality.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => navigate("/client/projects")}
            style={{ padding: "12px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14, boxShadow: "0 0 16px rgba(0,240,255,0.3)" }}>
            Back to Projects
          </button>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  const isReadonly = !!existingReview;

  return (
    <ClientLayout>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>

        {/* Back */}
        <button onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 32, padding: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#facc15", fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>
            {isReadonly ? "Your Review" : "Rate Your Experience"}
          </h1>
          <p style={{ color: "#8c90a0", fontSize: 14, margin: 0 }}>
            {isReadonly
              ? "You have already reviewed this project."
              : "Share your experience working with the AI Expert on this project."}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 36, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>

          {/* Star rating */}
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8c90a0", marginBottom: 16 }}>
              Overall Rating
            </label>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <StarRating value={rating} onChange={setRating} readonly={isReadonly} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: 28 }} />

          {/* Comment */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8c90a0", marginBottom: 10 }}>
              Your Review <span style={{ color: "#f87171" }}>{isReadonly ? "" : "*"}</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => { setComment(e.target.value); setError(""); }}
              readOnly={isReadonly}
              placeholder="Describe your experience with the expert — work quality, communication, on-time delivery..."
              rows={6}
              style={{
                width: "100%", background: isReadonly ? "rgba(255,255,255,0.02)" : "#1d2026",
                border: `1px solid ${error && !comment.trim() ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 10, padding: "14px 16px", color: "#e1e2eb", outline: "none",
                fontFamily: "Inter, sans-serif", fontSize: 14, resize: isReadonly ? "none" : "vertical",
                lineHeight: 1.7, boxSizing: "border-box", cursor: isReadonly ? "default" : "text",
              }}
              onFocus={(e) => { if (!isReadonly) e.target.style.borderColor = "#00F0FF"; }}
              onBlur={(e) => { if (!isReadonly) e.target.style.borderColor = error && !comment.trim() ? "#ef4444" : "rgba(255,255,255,0.12)"; }}
            />
            {!isReadonly && (
              <p style={{ fontSize: 12, color: comment.length > 450 ? "#f97316" : "#8c90a0", marginTop: 6, textAlign: "right" }}>
                {comment.length}/500
              </p>
            )}
          </div>

          {/* Quick tags — chỉ hiện khi chưa review */}
          {!isReadonly && (
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8c90a0", marginBottom: 10 }}>
                Quick Tags
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  "Great communication",
                  "Delivered on time",
                  "High quality work",
                  "Exceeded expectations",
                  "Would hire again",
                  "Professional",
                  "Creative solutions",
                  "Responsive",
                ].map((tag) => {
                  const active = comment.includes(tag);
                  return (
                    <button
                      key={tag} type="button"
                      onClick={() => {
                        if (active) {
                          setComment((prev) => prev.replace(tag + ". ", "").replace(tag, "").trim());
                        } else {
                          setComment((prev) => prev ? `${prev.trim()} ${tag}.` : `${tag}.`);
                        }
                      }}
                      style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontFamily: "Inter, sans-serif", cursor: "pointer", transition: "all 0.15s", background: active ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)", color: active ? "#00F0FF" : "#8c90a0", border: active ? "1px solid rgba(0,240,255,0.4)" : "1px solid rgba(255,255,255,0.1)", fontWeight: active ? 600 : 400 }}>
                      {active && "✓ "}{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {error}
            </div>
          )}

          {/* Buttons */}
          {!isReadonly ? (
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={() => navigate(-1)}
                style={{ flex: 1, padding: "13px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting}
                style={{ flex: 2, padding: "13px", background: submitting ? "#1d2026" : "#00F0FF", color: submitting ? "#8c90a0" : "#002022", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "Hanken Grotesk, sans-serif", boxShadow: submitting ? "none" : "0 0 20px rgba(0,240,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
                {submitting && <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>}
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/client/projects")}
              style={{ width: "100%", padding: "13px", background: "rgba(0,240,255,0.08)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.14)"; e.currentTarget.style.borderColor = "#00F0FF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.08)"; e.currentTarget.style.borderColor = "rgba(0,240,255,0.3)"; }}>
              Back to Projects
            </button>
          )}
        </div>

        {/* Review date nếu đã review */}
        {isReadonly && existingReview?.createdAt && (
          <p style={{ textAlign: "center", color: "#414754", fontSize: 12, marginTop: 16, fontFamily: "JetBrains Mono, monospace" }}>
            Reviewed on {new Date(existingReview.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}