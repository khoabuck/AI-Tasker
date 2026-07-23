// src/modules/client/pages/AIMatchingPage.jsx
// POST /api/recommendations/experts/from-prompt   { prompt }  →  Expert[]
// Response là array trực tiếp, đã sort theo matchScore giảm dần — không còn dùng GET /experts?keyword=


// Import hook useState để quản lý state trong React
// useState giúp component nhớ dữ liệu và tự render lại khi dữ liệu thay đổi
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import { aiMatchingService } from "../../../services/aiMatching.service";

const LEVEL_CONFIG = {
  JUNIOR:  { label: "Junior",  badge: "bg-slate-400/20 text-slate-400 border-slate-400/40" },
  MID:     { label: "Mid",     badge: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40" },
  SENIOR:  { label: "Senior",  badge: "bg-cyan-400/20 text-cyan-400 border-cyan-400/40" },
  EXPERT:  { label: "Expert",  badge: "bg-indigo-300/20 text-indigo-300 border-indigo-300/40" },
};

function StarRating({ rating }) {
  const safeRating = Math.max(
    0,
    Math.min(5, Number(rating ?? 0))
  );

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = star <= Math.floor(safeRating);
        const isHalf = !isFull && star - 0.5 <= safeRating;

        return (
          <span
            key={star}
            className={`material-symbols-outlined text-[15px] ${
              isFull || isHalf ? "text-yellow-400" : "text-gray-600"
            }`}
            style={{
              fontVariationSettings: isFull || isHalf
                ? "'FILL' 1"
                : "'FILL' 0",
            }}
          >
            {isHalf ? "star_half" : "star"}
          </span>
        );
      })}
    </div>
  );
}

/*
Component con: ExpertCard

Nhận dữ liệu từ component cha bằng props:

expert:
- thông tin một Expert từ API

onConnect:
- function xử lý khi bấm Connect

onViewProfile:
- lưu trạng thái trước khi qua trang Profile

Component này chỉ có nhiệm vụ hiển thị 1 Expert.
*/
function ExpertCard({ expert, onConnect, onViewProfile }) {
  const navigate = useNavigate();
  // Chuẩn hóa dữ liệu BE.
// BE có thể trả MID hoặc MID_LEVEL.
// Trong nghiệp vụ hai giá trị này là cùng một level.
  const normalizedLevel =
    expert.level === "MID_LEVEL"
      ? "MID"
      : expert.level;

  const level = LEVEL_CONFIG[normalizedLevel] || {
    label: expert.level,
    badge: "bg-gray-500/20 text-gray-400 border-gray-500/40"
  };
  // Lấy điểm matching từ BE.  FE chỉ hiển thị, không tự tính score.
  const matchScore = expert.matchScore ? Math.round(expert.matchScore) : null;

  // Rating/review lấy trực tiếp từ BE.
  // Không dùng profileScore để tính sao.
  const rating = Math.max(
    0,
    Math.min(5, Number(expert.averageRating ?? 0))
  );

  const totalReviews = Math.max(
    0,
    Number(expert.totalReviews ?? 0)
  );

  // Chọn danh sách skill để hiển thị.
// Hiện tại ưu tiên matchedSkills nếu AI tìm được skill phù hợp.
// Nếu không có thì dùng expertSkills.
  const skillsToShow = expert.matchedSkills?.length > 0 ? expert.matchedSkills : expert.expertSkills || [];
  const isMatchedSkills = expert.matchedSkills?.length > 0;

  return (
    <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#101319]/85 p-6 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-cyan-400/40">

      {/* Match score badge */}
      {matchScore !== null && (
        <div className="absolute right-0 top-0 rounded-bl-xl rounded-tr-2xl border-b border-l border-cyan-400/30 bg-cyan-400/10 px-3 py-1">
          <span className="font-mono text-[11px] font-bold text-cyan-400">{matchScore}% MATCH</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3.5">
        <img
          src={expert.avatarUrl}
          alt={expert.fullName}
          className="h-13 w-13 flex-shrink-0 rounded-full border-2 border-cyan-400/20 object-cover"
          style={{ width: 52, height: 52 }}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-gray-100">{expert.fullName}</h3>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold ${level.badge}`}>
              {level.label}
            </span>
          </div>
          <p className="font-mono text-xs text-cyan-400">{expert.professionalTitle}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StarRating rating={rating} />

            {totalReviews > 0 ? (
              <span className="font-mono text-[11px] text-gray-400">
                {rating.toFixed(1)} ({totalReviews}{" "}
                {totalReviews === 1 ? "review" : "reviews"})
              </span>
            ) : (
              <span className="font-mono text-[11px] text-gray-500">
                No reviews yet
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-gray-400">
              {expert.yearsOfExperience} yr{expert.yearsOfExperience !== 1 ? "s" : ""} exp
            </span>

            {expert.availableForWork && (
              <span className="flex items-center gap-1 text-[11px] text-green-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                Available
              </span>
            )}

            {expert.profileScore != null && (
              <span className="text-[11px] text-gray-400">
                Profile score: <span className="text-yellow-400">{expert.profileScore}</span>/100
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {expert.bio && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-gray-300">
          {expert.bio}
        </p>
      )}

      {/* Matched skill count */}
      {expert.requiredSkillCount > 0 && (
        <p className="text-xs text-gray-400">
          Matched <span className="font-bold text-cyan-400">{expert.matchedSkillCount}</span>/{expert.requiredSkillCount} required skills
        </p>
      )}

      {/* Match reason */}
      {expert.matchReason && (
        <div className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.04] px-3 py-2.5">
          <p className="text-xs leading-snug text-gray-300">
            <span className="font-semibold text-cyan-400">AI: </span>
            {expert.matchReason}
          </p>
        </div>
      )}

      {/* Skills */}
      {skillsToShow.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skillsToShow.map((s) => (
            <span key={s.skillId}
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${
                isMatchedSkills
                  ? "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-400"
                  : "border-white/10 bg-white/[0.04] text-gray-400"
              }`}>
              {s.skillName}
            </span>
          ))}
        </div>
      )}


      {/* Risk note */}
      {expert.riskNote && (
        <p className="flex items-center gap-1 text-[11px] text-yellow-400">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
          {expert.riskNote}
        </p>
      )}

      {/* Actions */}
      <div className="mt-auto flex gap-2.5 pt-4">
        <button
          onClick={() => { onViewProfile(); navigate(`/client/experts/${expert.expertProfileId}`); }}
          className="flex-1 rounded-lg border border-white/10 bg-[#1d2026] py-2.5 text-[13px] font-medium text-gray-100 transition-colors hover:bg-[#272a30]">
          View Profile
        </button>
        <button
          onClick={() => onConnect(expert)}
          className="flex-1 rounded-lg bg-cyan-400 py-2.5 font-display text-[13px] font-bold text-[#002022] shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-shadow hover:shadow-[0_0_20px_rgba(0,240,255,0.45)]">
          Connect
        </button>
      </div>
    </div>
  );
}

/*
Component chính của trang AI Matching.

Nhiệm vụ:
- Quản lý input tìm kiếm.
- Gọi API.
- Lưu danh sách Expert.
- Điều khiển trạng thái Loading/Error/Result.
*/
export default function AIMatchingPage() {
  const navigate = useNavigate();

  // Khôi phục lại query + kết quả search trước đó CHỈ khi quay lại bằng nút
  // "View Profile" → "Back" (cờ được đặt thủ công lúc bấm View Profile, xem
  // handleViewProfile bên dưới). Mọi cách khác để vào trang này (click menu,
  // gõ URL, từ trang khác) không đi qua cờ đó nên luôn bắt đầu sạch.
  // Đọc xong xóa luôn, để lần remount kế tiếp không qua View Profile sẽ không
  // còn "ăn" lại data cũ.
  const SESSION_KEY = "aiMatchingSearchState";

  // recentPrompts ("Try:" gợi ý) là dữ liệu khác hẳn về vòng đời — đây là lịch
  // sử lâu dài của người dùng, không phải kết quả tạm thời của 1 lượt xem, nên
  // dùng localStorage riêng và LUÔN đọc/giữ lại bất kể vào trang theo cách nào
  // (khác hẳn query/experts/hasSearched ở trên chỉ phục hồi khi back từ Profile).
  const RECENT_PROMPTS_KEY = "aiMatchingRecentPrompts";

  const restoreState = () => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const restoreRecentPrompts = () => {
    try {
      const saved = localStorage.getItem(RECENT_PROMPTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const initial = restoreState();

// query: nội dung người dùng nhập vào ô search.
  const [query, setQuery] = useState(initial?.query ?? "");
  const [searching, setSearching] = useState(false);
  const [experts, setExperts] = useState(initial?.experts ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [hasSearched, setHasSearched] = useState(initial?.hasSearched ?? false);
  const [error, setError] = useState("");
  const [recentPrompts, setRecentPrompts] = useState(restoreRecentPrompts());


  const saveSearchState = () => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          query,
          experts,
          total,
          hasSearched,
        })
      );
    } catch {
      // ignore
    }
  };

  // Lưu lại state NGAY LÚC bấm "View Profile" — điểm duy nhất đặt cờ cho phép
  // phục hồi kết quả search khi quay lại bằng nút Back. recentPrompts KHÔNG nằm
  // trong cờ này vì nó đã tự sống bền trong localStorage riêng (xem handleSearch).
  const handleViewProfile = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        query,
        experts,
        total,
        hasSearched,
      }));
    } catch {
      // Bỏ qua nếu sessionStorage đầy hoặc bị chặn — không ảnh hưởng chức năng chính
    }
  };

  // Đồng bộ đúng logic Connect của ExpertSearchPage — tạo conversation trực tiếp
  // (type: "DIRECT") rồi điều hướng sang Messages, không cần qua bước review proposal.
  const handleConnect = async (expert) => {
    saveSearchState();

    try {
      const conversationId = await aiMatchingService.findConversationWithExpert(expert);

      if (conversationId) {
        navigate(`/client/messages/${conversationId}`);
        return;
      }

      navigate(
        `/client/messages?newExpertUserId=${expert.userId}&newExpertProfileId=${expert.expertProfileId}&newExpertName=${encodeURIComponent(expert.fullName)}`
      );
    } catch (err) {
      console.error("Find conversation failed:", err);
      alert("Unable to open conversation with the Expert.");
    }
  };

  const handleSearch = async (searchText) => {
    const prompt = (searchText ?? query).trim();

    if (!prompt) return;

    setQuery(prompt);

    const updatedRecentPrompts = (() => {
      const updated = [prompt, ...recentPrompts.filter((item) => item !== prompt)];
      return updated.slice(0, 4);
    })();
    setRecentPrompts(updatedRecentPrompts);
    try {
      localStorage.setItem(RECENT_PROMPTS_KEY, JSON.stringify(updatedRecentPrompts));
    } catch {
      // Bỏ qua nếu localStorage đầy hoặc bị chặn — không ảnh hưởng chức năng chính
    }

    setSearching(true);
    setError("");

    try {
      const { items, total } =
        await aiMatchingService.findExpertsFromPrompt(prompt);

      setExperts(items);
      setTotal(total);
      setHasSearched(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to find experts. Please try again."
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <ClientLayout>
      <div className="min-h-screen overflow-x-hidden px-6 pb-16 pt-12">

        {/* Header */}
        <div className="mx-auto mb-10 max-w-[860px] text-center">
          <div className="mb-3 flex items-center justify-center gap-2.5">
            <span className="material-symbols-outlined text-cyan-400" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <h1 className="font-display text-4xl font-bold text-gray-100">
              AI Expert <span className="text-cyan-400">Matching</span>
            </h1>
          </div>
          <p className="text-[15px] text-gray-400">
            Describe your project — AI will find the most suitable experts for you
          </p>
        </div>

        {/* Search bar */}
        <div className="mx-auto mb-12 max-w-[860px]">
          <div className="relative">
            <div className="absolute -inset-[3px] z-0 rounded-[20px] bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-500 opacity-20 blur-[10px]" />
            <div className="relative z-10 flex items-center gap-3.5 rounded-2xl border border-cyan-400/20 bg-[#101319]/90 p-5 backdrop-blur-xl">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" style={{ fontSize: 20 }}>search</span>
                <input
                  type="text" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. I need an NLP expert for chatbot development..."
                  className="w-full rounded-lg border border-white/10 bg-[#1d2026] py-3.5 pl-12 pr-3.5 text-[15px] text-gray-100 outline-none transition-colors focus:border-cyan-400" />
              </div>
              <button onClick={() => handleSearch()} disabled={searching || !query.trim()}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-7 py-3.5 font-display text-sm font-bold transition-all ${
                  searching || !query.trim()
                    ? "cursor-not-allowed bg-[#1d2026] text-gray-400"
                    : "bg-cyan-400 text-[#002022] shadow-[0_0_16px_rgba(0,240,255,0.3)]"
                }`}>
                <span className={`material-symbols-outlined ${searching ? "animate-spin" : ""}`} style={{ fontSize: 20 }}>
                  {searching ? "autorenew" : "bolt"}
                </span>
                {searching ? "Searching..." : "Find Experts"}
              </button>
            </div>
          </div>

          {/* Example prompts */}
          {recentPrompts.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-gray-400">Try:</span>
              {recentPrompts.map((p) => {
                const shortPrompt = p.length > 32 ? `${p.slice(0, 32)}...` : p;
                return (
                  <button
                    key={p}
                    onClick={() => handleSearch(p)}
                    title={p}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300 transition hover:border-cyan-400/30 hover:text-cyan-400"
                  >
                    {shortPrompt}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty state */}
        {!hasSearched && !searching && !error && (
          <div className="py-16 text-center text-gray-400">
            <span className="material-symbols-outlined mb-4 block text-[#1d2026]" style={{ fontSize: 80 }}>group_search</span>
            <p className="mb-2 text-base text-[#414754]">Describe your project above</p>
            <p className="text-sm text-[#2d3038]">AI will analyze and find the most suitable experts</p>
          </div>
        )}

        {/* Loading */}
        {searching && (
          <div className="flex min-h-[500px] items-center justify-center text-center">
            <div>
              <span className="material-symbols-outlined mb-4 block animate-spin text-cyan-400" style={{ fontSize: 56 }}>
                autorenew
              </span>
              <p className="font-mono text-[15px] text-cyan-400">
                Analyzing and finding experts...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-auto max-w-[860px] rounded-lg border border-red-400/25 bg-red-400/[0.08] px-4.5 py-3.5 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && !searching && (
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="mb-1 font-display text-lg font-bold text-gray-100">
                  {experts.length > 0 ? "Matching Experts Found" : "No Experts Found"}
                </p>
                <p className="text-[13px] text-gray-400">
                  {experts.length > 0
                    ? `Showing ${experts.length} of ${total} experts matching "${query}"`
                    : `No experts found for "${query}". Try a different prompt.`}
                </p>
              </div>
              {experts.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="material-symbols-outlined text-cyan-400" style={{ fontSize: 16 }}>auto_awesome</span>
                  AI-ranked by relevance
                </div>
              )}
            </div>

            {experts.length > 0 ? (
              <div
                className="
                  grid
                  w-full
                  gap-5
                "
                style={{
                  gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(320px,100%),1fr))"
                }}
                >
                {experts.map((expert) => (
                  <ExpertCard key={expert.expertProfileId} expert={expert} onConnect={handleConnect} onViewProfile={handleViewProfile} />
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <span className="material-symbols-outlined mb-4 block text-[#272a30]" style={{ fontSize: 56 }}>person_search</span>
                <p className="text-[15px] text-gray-400">Try describing your needs differently, e.g. "I need a chatbot AI"...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}