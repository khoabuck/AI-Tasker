// src/modules/client/pages/ExpertSearchPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const SENIORITY_OPTIONS = [
  { label: "Fresher", value: "fresher" },
  { label: "Junior", value: "junior" },
  { label: "Mid", value: "mid" },
  { label: "Senior", value: "senior" },
  { label: "Lead", value: "lead" },
];

// Khôi phục query + kết quả search khi quay lại trang này (vd: bấm Back từ
// ExpertProfileViewPage) — ExpertSearchPage là route riêng, unmount hoàn toàn
// khi điều hướng đi nên useState bình thường luôn reset rỗng lúc remount.
// sessionStorage giữ được state qua việc đó, tự xóa khi đóng tab.
const SESSION_KEY = "expertSearchState";

// Đọc 1 lần rồi xóa luôn — chỉ "View Profile" mới được phép đặt cờ này trước
// khi điều hướng đi. Mọi cách vào trang khác (click menu, gõ URL, từ trang khác)
// sẽ không có cờ này nên luôn bắt đầu sạch. Xóa ngay sau khi đọc để lần remount
// kế tiếp (không qua View Profile) không bị "ăn" lại data cũ.
function restoreState() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function StarRating({ rating }) {
  return (
    <div className="mt-2 flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="material-symbols-outlined text-[16px] text-cyan-400" style={{ fontVariationSettings: "'FILL' 1" }}>
          {i <= Math.floor(rating) ? "star" : i - 0.5 <= rating ? "star_half" : "star_outline"}
        </span>
      ))}
    </div>
  );
}

function ExpertCard({ expert, onConnect, onViewProfile }) {
  const navigate = useNavigate();

  const name = expert.fullName;
  const role = expert.professionalTitle;
  const skills = expert.expertSkills?.map((s) => s.skillName) ?? [];
  const bio = expert.bio;
  const badge = expert.level;
  const rating = expert.profileScore ? expert.profileScore / 20 : 0;
  const expertProfileId = expert.expertProfileId;
  const isTertiary = badge === "TOP PICK";

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.12] p-6 backdrop-blur-md transition-colors ${
      isTertiary ? "bg-[#101319] hover:border-indigo-300/50" : "bg-[#1d2026]/80 hover:border-cyan-400/50"
    }`}>
      {badge && (
        <div className="absolute right-0 top-0 rounded-bl-xl border-b border-l border-cyan-400/20 bg-cyan-400/[0.09] px-3 py-1">
          <span className="font-mono text-[10px] font-bold text-cyan-400">{badge}</span>
        </div>
      )}

      <div className="mb-5 flex items-start gap-3">
        <img
          src={expert.avatarUrl || `https://i.pravatar.cc/100?u=${expertProfileId}`}
          alt={name}
          className="h-12 w-12 flex-shrink-0 rounded-full border-2 border-cyan-400/20 object-cover" />
        <div>
          <h4 className="font-display text-lg font-semibold text-gray-100">{name}</h4>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-cyan-400">{role}</p>
          {rating > 0 && <StarRating rating={rating} />}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span key={skill}
            className={`rounded px-2 py-1 font-mono text-[10px] ${
              isTertiary
                ? "border border-indigo-300/30 bg-indigo-300/10 text-indigo-300"
                : "border border-white/10 bg-[#272a30]/80 text-gray-300"
            }`}>
            {skill}
          </span>
        ))}
      </div>

      {bio && <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-gray-400">{bio}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => { onViewProfile(); navigate(`/client/experts/${expertProfileId}`); }}
          className="flex-1 rounded-lg border border-white/10 bg-transparent py-2 text-xs font-bold text-gray-100 transition-colors hover:bg-[#36393f]/50">
          View Profile
        </button>

        <button
          onClick={() => onConnect(expert)}
          className="flex-1 rounded-lg bg-cyan-400 py-2 text-xs font-bold text-[#101319] shadow-[0_0_15px_rgba(0,240,255,0.3)] transition hover:brightness-110">
          Connect
        </button>
      </div>
    </div>
  );
}

export default function ExpertSearchPage() {
  const initial = restoreState();

  const [query, setQuery] = useState(initial?.query ?? "");
  const [seniority, setSeniority] = useState(initial?.seniority ?? "");
  const [searching, setSearching] = useState(false);
  const [experts, setExperts] = useState(initial?.experts ?? []);
  const [hasSearched, setHasSearched] = useState(initial?.hasSearched ?? false);

  const navigate = useNavigate();

  const handleConnect = async (expert) => {
    try {
      const res = await axiosInstance.post("/conversations", {
        type: "DIRECT",
        expertUserId: expert.userId,
        expertProfileId: expert.expertProfileId,
        initialMessage: `Hi ${expert.fullName}, I want to discuss a project with you.`,
      });

      const conversationId =
        res.data?.conversationId ||
        res.data?.id ||
        res.data?.data?.conversationId ||
        res.data?.data?.id;

      navigate(`/client/messages${conversationId ? `?conversationId=${conversationId}` : ""}`);
    } catch (err) {
      console.error("Create conversation failed:", err);
      alert("Không thể tạo cuộc trò chuyện với Expert.");
    }
  };

  const toggleSeniority = (val) => { setSeniority((prev) => (prev === val ? "" : val)); };

  // Chỉ lưu lại state NGAY LÚC bấm "View Profile" — đây là điểm duy nhất đặt cờ
  // cho phép phục hồi data khi quay lại. Mọi cách khác để vào lại trang này
  // (click menu, gõ URL...) không đi qua đây, nên sessionStorage luôn trống và
  // trang tự reset sạch như mong đợi.
  const handleViewProfile = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        query,
        seniority,
        experts,
        hasSearched,
      }));
    } catch {
      // Bỏ qua nếu sessionStorage đầy hoặc bị chặn — không ảnh hưởng chức năng chính
    }
  };

  // Chỉ tự load lần đầu nếu chưa có sẵn kết quả phục hồi từ sessionStorage —
  // tránh search lại từ đầu (mất filter) ngay sau khi vừa restore xong.
  useEffect(() => {
    if (!initial?.hasSearched) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const res = await axiosInstance.get("/experts", {
        params: {
          keyword: query.trim() || undefined,
          availableOnly: true,
          page: 1,
          pageSize: 100,
        },
      });

      const data = res.data;
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);

      const filteredItems = seniority
        ? items.filter((expert) => {
            const level = String(expert.level || "").toLowerCase();
            return level === seniority.toLowerCase();
          })
        : items;

      setExperts(filteredItems);
      setHasSearched(true);
    } catch (err) {
      setExperts([]);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setQuery("");
    setSeniority("");
    setExperts([]);
    setHasSearched(false);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setTimeout(() => handleSearch(), 0);
  };

  return (
    <ClientLayout>
      <div className="min-h-screen px-6 pb-12 pt-12">

        {/* Header */}
        <div className="mx-auto mb-8 max-w-[900px] text-center">
          <h1 className="mb-2 font-display text-4xl font-bold text-gray-100">
            Expert <span className="text-cyan-400">Search</span>
          </h1>
          <p className="text-[15px] text-gray-400">Tìm kiếm Expert theo tên, kỹ năng hoặc từ khóa</p>
        </div>

        {/* Search Bar */}
        <section className="mx-auto mb-12 max-w-[900px]">
          <div className="relative">
            <div className="absolute -inset-1 z-0 rounded-[20px] bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-500 opacity-25 blur-lg" />
            <div className="relative z-10 flex items-center gap-4 rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-6 backdrop-blur-md">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 22 }}>search</span>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search experts by name, skill, or keyword..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b0e14] py-4 pl-[52px] pr-4 text-[15px] text-gray-100 outline-none transition-colors focus:border-cyan-400" />
              </div>
              <button onClick={handleSearch} disabled={searching}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-8 py-4 font-display text-[15px] font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] ${
                  searching ? "cursor-not-allowed bg-cyan-400/80 text-[#101319]" : "bg-cyan-400 text-[#101319]"
                }`}>
                {searching ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">autorenew</span>
                    Searching...
                  </>
                ) : "Search"}
              </button>
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1400px] gap-6">

          {/* Sidebar Filters */}
          <aside className="w-[272px] flex-shrink-0">
            <div className="sticky top-20 rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-6 backdrop-blur-md">
              <div className="mb-6 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wide text-cyan-400">Filters</span>
                <button onClick={handleReset} className="text-xs text-gray-400 transition-colors hover:text-gray-100">
                  Reset All
                </button>
              </div>
              <div className="mb-6">
                <label className="mb-3 block font-mono text-[10px] uppercase tracking-wider text-gray-400">Seniority</label>
                <div className="grid grid-cols-2 gap-2">
                  {SENIORITY_OPTIONS.map((s) => {
                    const isSelected = seniority === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleSeniority(s.value)}
                        className={`rounded-md px-2 py-2 text-xs transition-all ${
                          isSelected
                            ? "border border-cyan-400 bg-cyan-400/10 text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                            : "border border-white/10 bg-[#272a30] text-gray-300 hover:border-cyan-400/50 hover:text-cyan-400"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="button" onClick={handleSearch} disabled={searching}
                className="mt-4 w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-[#101319] shadow-[0_0_15px_rgba(0,240,255,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
                {searching ? "Applying..." : "Apply"}
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {searching && (
              <div className="py-20 text-center">
                <span className="material-symbols-outlined mb-4 block animate-spin text-cyan-400" style={{ fontSize: 64 }}>autorenew</span>
                <p className="font-mono text-base text-cyan-400">Searching...</p>
              </div>
            )}
            {hasSearched && !searching && (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <p className="font-mono text-xs text-gray-400">
                    Showing <span className="text-cyan-400">{experts.length}</span> experts found
                  </p>
                </div>
                {experts.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <span className="material-symbols-outlined mb-3 block text-[#232A35]" style={{ fontSize: 56 }}>search_off</span>
                    <p className="text-[15px]">Không tìm thấy Expert phù hợp</p>
                  </div>
                ) : (
                  <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                    {experts.map((expert) => (
                      <ExpertCard key={expert.expertProfileId} expert={expert} onConnect={handleConnect} onViewProfile={handleViewProfile} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}