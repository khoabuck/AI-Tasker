// src/modules/client/pages/ClientDashboard.jsx
// Trang chính của Client sau khi đăng nhập — danh sách AI Expert

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";
import { findExistingConversationWithExpert } from "../../../utils/conversation.util";


// ─── Component con: 1 Expert Card ─────────────────────
function ExpertCard({ expert, onConnect }) {
  const navigate = useNavigate();
  const skills = expert.expertSkills?.map((s) => s.skillName) || [];

  return (
    <div className="min-w-[320px] max-w-[320px] glass-card p-6 rounded-xl flex flex-col space-y-6
                hover:border-cyan-400 hover:-translate-y-1
                hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-300">

      <div>
        <h3 className="text-xl font-bold text-white">{expert.fullName}</h3>
        <p className="text-xs font-mono text-cyan-400 tracking-wider mt-1">
          {expert.professionalTitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/10">
        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">
            Level
          </p>
          <p className="text-sm font-bold text-white">
            {expert.level}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">
            Experience
          </p>
          <p className="text-sm font-bold text-white">
            {expert.yearsOfExperience} Years
          </p>
        </div>

        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">
            Profile Score
          </p>
          <p className="text-sm font-bold text-cyan-400">
            {expert.profileScore}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">
            Available
          </p>
          <p className="text-sm font-bold text-white">
            {expert.availableForWork ? "Yes" : "No"}
          </p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-3">
          Core Expertise
        </p>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-1 rounded text-[10px] font-mono
                         bg-cyan-400/10 text-[#d3fbff] border border-cyan-400/20"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 flex gap-3">
        <button
          type="button"
          onClick={() => navigate(`/client/experts/${expert.expertProfileId}`)}
          className="flex-1 py-2.5 bg-transparent border border-cyan-400 text-cyan-400
                    text-xs font-bold rounded-lg hover:bg-cyan-400/10 transition-all"
        >
          View Profile
        </button>

        <button
          type="button"
          onClick={() => onConnect(expert)}
          className="flex-1 py-2.5 bg-cyan-400 text-gray-900
                    text-xs font-bold rounded-lg hover:brightness-110 transition-all"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

// ─── Component con: 1 Section experts ─────────────────
const CARD_WIDTH = 320;
const CARD_GAP = 24; // gap-6 = 1.5rem = 24px
const VISIBLE_CARDS = 3;

function ExpertSection({ title, icon, iconColor, experts, onConnect }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  if (!experts || experts.length === 0) return null;

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experts.length]);

  // Cuộn đúng 1 card mỗi lần bấm — dùng đúng kích thước card thật (320px + gap),
  // không phải con số ước lượng, để luôn dừng lại đúng ranh giới card, không
  // bao giờ để lộ nửa card lưng chừng như giao diện cũ.
  const scrollByOneCard = (direction) => {
    scrollRef.current?.scrollBy({
      left: direction * (CARD_WIDTH + CARD_GAP),
      behavior: "smooth",
    });
  };

  const showArrows = experts.length > VISIBLE_CARDS;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 border-l-4 border-cyan-400 pl-4">
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <span className={`material-symbols-outlined ${iconColor}`}>
          {icon}
        </span>
      </div>

      {/* Khung carousel: overflow-hidden để KHÔNG để lộ card kế tiếp bị cắt nửa —
          chỉ thấy đúng số card trọn vẹn vừa khít, phần còn lại chỉ hiện ra khi
          bấm mũi tên. 2 nút mũi tên đặt nổi tuyệt đối ở 2 mép trái/phải, căn
          giữa theo chiều dọc — đúng pattern carousel chuẩn thay vì nằm ở góc trên. */}
      <div className="relative">
        <div
            ref={scrollRef}
            className="mx-auto flex gap-6 overflow-x-hidden scroll-smooth
                      [scrollbar-width:none] [-ms-overflow-style:none]
                      [&::-webkit-scrollbar]:hidden"
            style={{
              width:
                VISIBLE_CARDS * CARD_WIDTH +
                (VISIBLE_CARDS - 1) * CARD_GAP,
            }}
          >
          {experts.map((expert) => (
            <ExpertCard
              key={expert.expertProfileId}
              expert={expert}
              onConnect={onConnect}
            />
          ))}
        </div>

        {showArrows && (
          <>
            <button
              type="button"
              onClick={() => scrollByOneCard(-1)}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="absolute -left-5 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full
                         border border-cyan-400/60 bg-[#0b0e14] text-cyan-400 shadow-[0_4px_16px_rgba(0,0,0,0.4)]
                         transition-all hover:bg-cyan-400/10
                         disabled:cursor-not-allowed disabled:border-white/10 disabled:text-gray-600 disabled:hover:bg-[#0b0e14]"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>

            <button
              type="button"
              onClick={() => scrollByOneCard(1)}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="absolute -right-5 top-1/2 z-10 flex h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full
                         border border-cyan-400/60 bg-[#0b0e14] text-cyan-400 shadow-[0_4px_16px_rgba(0,0,0,0.4)]
                         transition-all hover:bg-cyan-400/10
                         disabled:cursor-not-allowed disabled:border-white/10 disabled:text-gray-600 disabled:hover:bg-[#0b0e14]"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
// ─── Page chính ───────────────────────────────────────
export default function ClientDashboard() {
  const navigate = useNavigate();
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axiosInstance.get("/experts", {
          params: {
            availableOnly: true,
            page: 1,
            pageSize: 12,
          },
        });

        const raw = res.data;
        const items = Array.isArray(raw) ? raw : raw?.items || raw?.data || [];
        setExperts(items);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Could not load expert list."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchExperts();
  }, []);

  // code mới
  const handleConnect = async (expert) => {
    try {
      const existing = await findExistingConversationWithExpert(axiosInstance, {
        expertUserId: expert.userId,
      });

      if (existing?.conversationId) {
        navigate(`/client/messages/${existing.conversationId}`);
        return;
      }

      navigate(
        `/client/messages?newExpertUserId=${expert.userId}&newExpertProfileId=${expert.expertProfileId}&newExpertName=${encodeURIComponent(expert.fullName)}`
      );
    } catch (err) {
      console.error("Find conversation failed:", err);
      alert("Unable to open conversation with the expert.");
    }
  };

  const seniorExperts = experts.filter((e) => e.level === "SENIOR");
  const midExperts = experts.filter((e) => e.level === "MID");
  const juniorExperts = experts.filter((e) => e.level === "JUNIOR");
  return (
    <ClientLayout>
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12 space-y-12">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-blue-400 tracking-tight">
            AI Expert Marketplace
          </h2>
          <p className="text-gray-400 max-w-2xl">
            Browse available AI experts by level, experience, profile score, and skills.
          </p>
        </div>

        {loading && (
          <p className="text-gray-400">Đang tải danh sách expert...</p>
        )}

        {error && (
          <p className="text-red-400">{error}</p>
        )}

        {!loading && !error && experts.length === 0 && (
          <p className="text-gray-400">Chưa có expert nào.</p>
        )}
      {!loading && !error && experts.length > 0 && (
        <>
          <ExpertSection
            title="Senior Experts"
            icon="workspace_premium"
            iconColor="text-yellow-400"
            experts={seniorExperts}
            onConnect={handleConnect}
          />

          <ExpertSection
            title="Mid Experts"
            icon="verified"
            iconColor="text-cyan-400"
            experts={midExperts}
            onConnect={handleConnect}
          />

          <ExpertSection
            title="Junior Experts"
            icon="school"
            iconColor="text-green-400"
            experts={juniorExperts}
            onConnect={handleConnect}
          />
        </>
      )}
      </section>
    </ClientLayout>
  );
}