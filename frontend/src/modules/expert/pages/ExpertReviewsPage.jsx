import { useEffect, useMemo, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import reviewService from "../../../services/review.service";

export default function ExpertReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    return {
      total,
      average,
      fiveStar,
      positive,
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

    return reviews;
  }, [filter, reviews]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");

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
                projects.
              </p>
            </div>

            <button
              type="button"
              onClick={loadReviews}
              disabled={loading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
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
                  />
                ))}
              </div>
            )}
          </section>
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

function ReviewCard({ review }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <Avatar name={review.reviewerName} url={review.reviewerAvatarUrl} />

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{review.reviewerName}</h3>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                {formatDate(review.createdAt)}
              </span>
            </div>

            <p className="text-sm font-semibold text-cyan-300">
              {review.projectTitle}
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              {review.comment || "No written feedback."}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3">
          <StarRating rating={review.rating} />
        </div>
      </div>
    </article>
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

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}