// src/modules/client/pages/ExpertSearchPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";
import { findExistingConversationWithExpert } from "../../../utils/conversation.util";

// "Mid" gộp cả 2 giá trị BE (MID và MID_LEVEL) vào 1 nút hiển thị duy nhất.
// values.length > 1 → không gửi `level` lên API (BE chỉ nhận 1 giá trị đơn
// theo code cũ `level: seniority`), thay vào đó tự lọc phía FE sau khi nhận
// kết quả — tránh đoán sai việc BE có hỗ trợ multi-value hay không.
const SENIORITY_OPTIONS = [
  { label: "Fresher", key: "FRESHER", values: ["FRESHER"] },
  { label: "Junior",  key: "JUNIOR",  values: ["JUNIOR"] },
  { label: "Mid",     key: "MID",     values: ["MID", "MID_LEVEL"] },
  { label: "Senior",  key: "SENIOR",  values: ["SENIOR"] },
];

const RATING_OPTIONS = [
  { label: "5 stars", value: "5" },
  { label: "4 stars", value: "4" },
  { label: "3 stars", value: "3" },
  { label: "2 stars", value: "2" },
  { label: "1 star", value: "1" },
];

// Lưu trạng thái search tạm thời.
const SESSION_KEY = "expertSearchState";

//Khôi phục kết quả search cũ.
function restoreState() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

//Hiển thị số sao.
function StarRating({ rating, className = "mt-2", sizeClass = "text-[16px]" }) {
  // ko cho vượt quá 0 - 5 sao
  const safeRating = Math.max(
    0,
    Math.min(5, Number(rating ?? 0))
  );

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= Math.floor(safeRating);

        return (
          <span
            key={star}
            className={`${sizeClass} leading-none ${
              isActive ? "text-yellow-400" : "text-gray-600"
            }`}
          >
            {isActive ? "★" : "☆"}
          </span>
        );
      })}
    </div>
  );
}

// hiện thị 1 expert
function ExpertCard({ expert, onConnect, onViewProfile }) {
  const navigate = useNavigate();

  const name = expert.fullName;
  const role = expert.professionalTitle;
  const expertSkillNames =
  expert.expertSkills
    ?.map((s) => s.skillName)
    .filter(Boolean) ?? [];

  const skills =
    expertSkillNames.length > 0
      ? expertSkillNames
      : typeof expert.skills === "string"
        ? expert.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [];
  const bio = expert.bio;
  const badge = expert.level;

  const rating = Math.max(
    0,
    Math.min(5, Number(expert.averageRating ?? 0))
  );

  const totalReviews = Math.max(
    0,
    Number(expert.totalReviews ?? 0)
  );

  const expertProfileId = expert.expertProfileId;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-6 backdrop-blur-md transition-colors hover:border-cyan-400/50">
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

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StarRating rating={rating} className="" />

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
      </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span key={skill}
            className="rounded border border-white/10 bg-[#272a30]/80 px-2 py-1 font-mono text-[10px] text-gray-300">
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

// Lấy toàn bộ Expert từ API.
async function fetchAllExperts(params) {
  // Không truyền page/pageSize.
  // BE tự dùng cấu hình mặc định và trả page + totalPages.
  const firstResponse = await axiosInstance.get("/experts", {
    params,
  });

  const firstData = firstResponse.data;

  const allExperts = Array.isArray(firstData?.items)
    ? [...firstData.items]
    : [];

  const currentPage = Number(firstData?.page ?? 1);
  const totalPages = Number(firstData?.totalPages ?? currentPage);

  for (
    let page = currentPage + 1;
    page <= totalPages;
    page += 1
  ) {
    const response = await axiosInstance.get("/experts", {
      params: {
        ...params,
        page,
      },
    });

    const pageItems = Array.isArray(response.data?.items)
      ? response.data.items
      : [];

    allExperts.push(...pageItems);
  }

  return allExperts;
}

export default function ExpertSearchPage() {
  const [initial] = useState(() => restoreState());

  const [query, setQuery] = useState(initial?.query ?? "");
  const [seniority, setSeniority] = useState(initial?.seniority ?? "");
  const [ratingFilter, setRatingFilter] = useState(initial?.ratingFilter ?? "");
  const [searching, setSearching] = useState(false);
  const [experts, setExperts] = useState(initial?.experts ?? []);
  const [hasSearched, setHasSearched] = useState(initial?.hasSearched ?? false);
  const [connectError, setConnectError] = useState("");

  const navigate = useNavigate();

  //Lưu lại trạng thái tìm kiếm hiện tại của trang Expert Search trước khi chuyển sang trang khác.
  // NOTE: sessionStorage chỉ lưu được dạng string. không lưu trực tiếp được. Nên dùng JSON.stringify()
  const saveSearchState = () => {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        query,
        seniority,
        ratingFilter,
        experts,
        hasSearched,
      })
    );
  } catch {
    // ignore
  }
};

  const handleConnect = async (expert) => {
    saveSearchState();
    setConnectError("");
    try {
      // Client hiện tại đã từng chat với Expert này chưa?
      const existing = await findExistingConversationWithExpert(axiosInstance, {
        expertUserId: expert.userId,
      });

      // Nếu đã có conversation
      // ?. optional chaining. Kiểm tra an toàn.
      if (existing?.conversationId) {
        navigate(`/client/messages/${existing.conversationId}`); // mở chat cũ nếu tr đó đa có nhắn tin
        return;
      }

      // Nếu ch có conversation
      //Chuyển sang trang Messages nhưng truyền thông tin Expert cần tạo chat.
      navigate(
        `/client/messages?newExpertUserId=${expert.userId}&newExpertProfileId=${expert.expertProfileId}&newExpertName=${encodeURIComponent(expert.fullName)}`
      );
    } catch (err) {
      setConnectError(
        err?.response?.data?.message ||
          "Unable to open conversation with the expert."
      );
    }
  };

  //Xử lý chọn/bỏ chọn filter level.
  const toggleSeniority = (key) => {
    setSeniority((prev) => (prev === key ? "" : key));
  };

  const toggleRating = (value) => {
    setRatingFilter((prev) => (prev === value ? "" : value));
  };

  // Chỉ lưu lại state NGAY LÚC bấm "View Profile" — đây là điểm duy nhất đặt cờ
  // cho phép phục hồi data khi quay lại. Mọi cách khác để vào lại trang này
  // (click menu, gõ URL...) không đi qua đây, nên sessionStorage luôn trống và
  // trang tự reset sạch như mong đợi.
  const handleViewProfile = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        query,
        seniority,
        ratingFilter,
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

  //Đây là hàm xử lý hành động Search Expert.
  const handleSearch = async (override = {}) => {
    const nextQuery = override.query ?? query; //Lấy query để tìm. ??: Nếu bên trái có giá trị thì dùng, nếu không thì lấy bên phải.
    const nextSeniority = override.seniority ?? seniority;
    const nextRatingFilter = override.ratingFilter ?? ratingFilter;

    setSearching(true);

    try {
      //Tìm cấu hình level tương ứng.
      const selectedOption = SENIORITY_OPTIONS.find(
        (s) => s.key === nextSeniority
      );

      // Chỉ gửi `level` lên BE khi option đó ứng với đúng 1 giá trị enum thật.
      // Option "Mid" gộp MID + MID_LEVEL nên lọc phía FE.
      const levelParam =
        selectedOption && selectedOption.values.length === 1
          ? selectedOption.values[0]
          : undefined;

       //Gọi Backend lấy danh sách Expert.
       //Gọi API
      let items = await fetchAllExperts({
        keyword: nextQuery.trim() || undefined,
        level: levelParam,
        availableOnly: true,
      });

      // Lọc phía FE riêng cho "Mid" vì BE chỉ nhận 1 level.
      if (selectedOption && selectedOption.values.length > 1) {
        items = items.filter((e) =>
          selectedOption.values.includes((e.level || "").toUpperCase())
        );
      }

      // API /experts hiện chưa có query param lọc rating,
      // nên lọc sao ở FE sau khi lấy danh sách.
      if (nextRatingFilter) {
        const selectedRating = Number(nextRatingFilter);

        items = items.filter((e) => {
          const avg = Number(e.averageRating ?? 0);
          const reviews = Number(e.totalReviews ?? 0);

          if (reviews <= 0) return false;

          if (selectedRating === 5) {
            return avg === 5;
          }

          return avg >= selectedRating && avg < selectedRating + 1;
        });
      }
      setExperts(items);
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
    setRatingFilter("");
    setExperts([]);
    setHasSearched(false);

    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }

    handleSearch({
      query: "",
      seniority: "",
      ratingFilter: "",
    });
  };

  return (
    <ClientLayout>
      <div className="px-6 pb-12 pt-12">

        {/* Header */}
        <div className="mx-auto mb-8 max-w-[900px] text-center">
          <h1 className="mb-2 font-display text-4xl font-bold text-gray-100">
            Expert <span className="text-cyan-400">Search</span>
          </h1>
          <p className="text-[15px] text-gray-400">Search experts by name, skill, or keyword</p>
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
              <button onClick={() => handleSearch()} disabled={searching}
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
                  const isSelected = seniority === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSeniority(s.key)}
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

            <div className="mb-6">
              <label className="mb-3 block font-mono text-[10px] uppercase tracking-wider text-gray-400">Rating</label>

              <div className="space-y-2">
                {RATING_OPTIONS.map((option) => {
                  const isSelected = ratingFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleRating(option.value)}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs transition-all ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-400/10 text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                          : "border-white/10 bg-[#272a30] text-gray-300 hover:border-cyan-400/50 hover:text-cyan-400"
                      }`}
                    >
                      <span>{option.label}</span>
                      <StarRating
                        rating={Number(option.value)}
                        className=""
                        sizeClass="text-[13px]"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={() => handleSearch()} disabled={searching}
                className="mt-4 w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-[#101319] shadow-[0_0_15px_rgba(0,240,255,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
                {searching ? "Applying..." : "Apply"}
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {connectError && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                <span className="material-symbols-outlined text-[18px]">
                  error
                </span>

                {connectError}
              </div>
            )}
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
                    <p className="text-[15px]">No matching experts found</p>
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