import { useEffect, useMemo, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import reviewService from "../../../services/review.service";

const EMPTY_REPORT_FORM = {
  reason: "",
};

export default function ExpertReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState("all");

  const [reportTarget, setReportTarget] = useState(null);
  const [reportForm, setReportForm] = useState(EMPTY_REPORT_FORM);
  const [reportErrors, setReportErrors] = useState({});

  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadReviews();
  }, []);

  const stats = useMemo(() => {
    const total = reviews.length;

    const average =
      total > 0
        ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          total
        : 0;

    const fiveStar = reviews.filter((item) => Number(item.rating) === 5).length;
    const positive = reviews.filter((item) => Number(item.rating) >= 4).length;
    const reported = reviews.filter((item) => item.hasReported).length;

    return {
      total,
      average,
      fiveStar,
      positive,
      reported,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (filter === "five") {
      return reviews.filter((item) => Number(item.rating) === 5);
    }

    if (filter === "positive") {
      return reviews.filter((item) => Number(item.rating) >= 4);
    }

    if (filter === "critical") {
      return reviews.filter((item) => Number(item.rating) < 4);
    }

    if (filter === "reported") {
      return reviews.filter((item) => item.hasReported);
    }

    return reviews;
  }, [filter, reviews]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await reviewService.getMyReviews();

      setReviews(data);
    } catch (err) {
      console.error("LOAD EXPERT REVIEWS ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load reviews."));
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const openReportModal = (review) => {
    if (!review?.reviewId) {
      setError("Cannot report this review because review id is missing.");
      return;
    }

    if (review.hasReported) {
      setError("This review has already been reported.");
      return;
    }

    setReportTarget(review);
    setReportForm(EMPTY_REPORT_FORM);
    setReportErrors({});
    setError("");
    setMessage("");
  };

  const closeReportModal = () => {
    if (reporting) return;

    setReportTarget(null);
    setReportForm(EMPTY_REPORT_FORM);
    setReportErrors({});
  };

  const updateReportField = (name, value) => {
    setReportForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setReportErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
  };

  const validateReportForm = () => {
    const errors = {};
    const reason = reportForm.reason.trim();

    if (!reason) {
      errors.reason = "Please enter the reason for reporting this review.";
    } else if (reason.length < 10) {
      errors.reason = "Reason must be at least 10 characters.";
    } else if (reason.length > 500) {
      errors.reason = "Reason cannot exceed 500 characters.";
    }

    return errors;
  };

  const handleSubmitReport = async () => {
    const reviewId = reportTarget?.reviewId;

    if (!reviewId) {
      setError("Cannot report this review because review id is missing.");
      return;
    }

    const errors = validateReportForm();

    if (Object.keys(errors).length > 0) {
      setReportErrors(errors);
      setError("Please check the highlighted field before submitting.");
      return;
    }

    try {
      setReporting(true);
      setError("");
      setMessage("");
      setReportErrors({});

      await reviewService.reportReview(reviewId, reportForm);

      setReviews((prev) =>
        prev.map((item) =>
          item.reviewId === reviewId
            ? {
                ...item,
                hasReported: true,
                reportStatus: "OPEN",
              }
            : item
        )
      );

      closeReportModal();
      setMessage(
        "Your report has been submitted. Admin will review it as soon as possible."
      );
    } catch (err) {
      console.error("REPORT REVIEW ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot submit review report."));
    } finally {
      setReporting(false);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Reviews
              </p>

              <h1 className="text-3xl font-extrabold text-white md:text-4xl">
                Client reviews
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                View ratings and feedback clients left for your completed
                projects. If a review is unfair or violates platform rules, you
                can report it for admin review.
              </p>
            </div>

            <button
              type="button"
              onClick={loadReviews}
              disabled={loading || reporting}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {message && (
            <Alert
              type="success"
              title="Success"
              message={message}
              onClose={() => setMessage("")}
            />
          )}

          {error && (
            <Alert
              type="danger"
              title="Action failed"
              message={error}
              onClose={() => setError("")}
            />
          )}

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-5">
            <SummaryCard
              icon="reviews"
              label="Total Reviews"
              value={stats.total}
              tone="cyan"
            />

            <SummaryCard
              icon="star"
              label="Average Rating"
              value={stats.average.toFixed(1)}
              tone="yellow"
            />

            <SummaryCard
              icon="workspace_premium"
              label="5-Star Reviews"
              value={stats.fiveStar}
              tone="green"
            />

            <SummaryCard
              icon="thumb_up"
              label="Positive Reviews"
              value={stats.positive}
              tone="green"
            />

            <SummaryCard
              icon="flag"
              label="Reported"
              value={stats.reported}
              tone="red"
            />
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Review History
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredReviews.length} review(s)
                </p>
              </div>

              <div className="flex flex-wrap rounded-xl border border-white/10 bg-white/[0.04] p-1">
                <FilterButton
                  label="All"
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                />

                <FilterButton
                  label="5 Stars"
                  active={filter === "five"}
                  onClick={() => setFilter("five")}
                />

                <FilterButton
                  label="Positive"
                  active={filter === "positive"}
                  onClick={() => setFilter("positive")}
                />

                <FilterButton
                  label="Critical"
                  active={filter === "critical"}
                  onClick={() => setFilter("critical")}
                />

                <FilterButton
                  label="Reported"
                  active={filter === "reported"}
                  onClick={() => setFilter("reported")}
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-gray-400">
                Loading reviews...
              </div>
            ) : filteredReviews.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review, index) => (
                  <ReviewCard
                    key={review.reviewId || `${review.projectId}-${index}`}
                    review={review}
                    disabled={reporting}
                    onReport={() => openReportModal(review)}
                  />
                ))}
              </div>
            )}
          </section>

          {reportTarget && (
            <ReportReviewModal
              review={reportTarget}
              form={reportForm}
              errors={reportErrors}
              loading={reporting}
              onClose={closeReportModal}
              onChange={updateReportField}
              onConfirm={handleSubmitReport}
            />
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function SummaryCard({ icon, label, value, tone }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : tone === "red"
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
        active
          ? "bg-cyan-400 text-black"
          : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function ReviewCard({ review, disabled, onReport }) {
  const hasReported = Boolean(review.hasReported);
  const reviewStatus = String(review.status || "").toUpperCase();

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <Avatar name={review.reviewerName} url={review.reviewerAvatarUrl} />

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{review.reviewerName}</h3>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                {formatDate(review.createdAt)}
              </span>

              {reviewStatus && (
                <StatusBadge status={reviewStatus} />
              )}

              {hasReported && (
                <StatusBadge status={review.reportStatus || "OPEN"} labelPrefix="Report" />
              )}
            </div>

            <p className="text-sm font-semibold text-cyan-300">
              {review.projectTitle}
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              {review.comment || "No written feedback."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3">
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3">
            <StarRating rating={review.rating} />
          </div>

          <button
            type="button"
            disabled={disabled || hasReported}
            onClick={onReport}
            className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasReported ? "Reported" : "Report Review"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ReportReviewModal({
  review,
  form,
  errors,
  loading,
  onClose,
  onChange,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 text-red-300">
            <span className="material-symbols-outlined text-2xl">flag</span>
          </div>

          <h2 className="text-2xl font-black text-white">Report Review</h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            Report this review if it is unfair, abusive, misleading, spam, or
            violates platform policy. Admin will review your report.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">
                  {review.projectTitle}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  By {review.reviewerName || "Client"} ·{" "}
                  {formatDate(review.createdAt)}
                </p>
              </div>

              <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-sm font-bold text-yellow-300">
                {Number(review.rating || 0).toFixed(1)} / 5
              </div>
            </div>

            <p className="text-sm leading-6 text-gray-300">
              {review.comment || "No written feedback."}
            </p>
          </div>

          <TextArea
            label="Report Reason"
            value={form.reason}
            error={errors.reason}
            onChange={(value) => onChange("reason", value)}
            placeholder="Explain clearly why this review should be reviewed by admin."
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl border border-red-400/50 bg-red-400/10 px-6 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextArea({ label, value, error, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label} <span className="text-red-400">*</span>
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        maxLength={500}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 bg-red-500/10 focus:border-red-400"
            : "border-white/10 bg-white/[0.04] focus:border-cyan-400/50"
        }`}
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        {error ? (
          <p className="text-sm font-semibold text-red-300">{error}</p>
        ) : (
          <p className="text-xs leading-5 text-gray-500">
            Minimum 10 characters. Maximum 500 characters.
          </p>
        )}

        <p className="shrink-0 text-xs text-gray-500">
          {String(value || "").length}/500
        </p>
      </div>
    </div>
  );
}

function Alert({ type, title, message, onClose }) {
  const className =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : "border-red-500/30 bg-red-500/10 text-red-200";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status, labelPrefix = "" }) {
  const value = String(status || "").toUpperCase();

  const style =
    value === "VISIBLE" || value === "OPEN"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : value === "HIDDEN" || value === "ACCEPTED" || value === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "REJECTED" || value === "CANCELLED" || value === "CANCELED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-gray-400/30 bg-gray-400/10 text-gray-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {labelPrefix ? `${labelPrefix}: ` : ""}
      {formatLabel(value)}
    </span>
  );
}

function Avatar({ name, url }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-sm font-black text-cyan-300">
      {getInitials(name)}
    </div>
  );
}

function StarRating({ rating }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));

  return (
    <div>
      <div className="flex items-center gap-0.5 text-yellow-300">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="material-symbols-outlined text-[20px]">
            {index < Math.round(safeRating) ? "star" : "star_outline"}
          </span>
        ))}
      </div>

      <p className="mt-1 text-center text-xs font-bold text-yellow-200">
        {safeRating.toFixed(1)} / 5
      </p>
    </div>
  );
}

function EmptyState({ filter }) {
  const text =
    filter === "five"
      ? "You do not have 5-star reviews yet."
      : filter === "positive"
      ? "You do not have positive reviews yet."
      : filter === "critical"
      ? "You do not have critical reviews."
      : filter === "reported"
      ? "You have not reported any reviews yet."
      : "Client reviews will appear here after completed projects.";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        rate_review
      </span>

      <h3 className="font-bold text-white">No reviews</h3>

      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </div>
  );
}

function getInitials(name) {
  return String(name || "Client")
    .split(" ")
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}