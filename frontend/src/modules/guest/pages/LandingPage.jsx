// src/modules/guest/pages/LandingPage.jsx
// Trang chủ — bỏ toggle sáng/tối (ép dark), lấy list Expert từ API thật.
// Bấm vào bất kỳ expert nào → chuyển sang /login (khách chưa đăng nhập).

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";

import Navbar            from "../../../components/layout/Navbar";
import Footer            from "../../../components/layout/Footer";
import HeroSection       from "../../../components/layout/HeroSection";
import StatsSection      from "../../../components/layout/StatsSection";
import CategoriesSection from "../../../components/layout/CategoriesSection";
import ProjectsSection   from "../../../components/layout/ProjectsSection";
import HowItWorksSection from "../../../components/layout/HowItWorksSection";

// ── Section list Expert lấy từ /api/experts ───────────────────────────
function ExpertsFromApi({ onExpertClick }) {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasLoadedOnce = useRef(false);

  const fetchExperts = useCallback(async (signal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError("");
    try {
      // BE hỗ trợ phân trang + lọc; lấy 12 expert đang available.
      const res = await axiosInstance.get("/experts", {
        params: { availableOnly: true, page: 1, pageSize: 12 },
        signal,
      });
      const raw = res.data;
      // Response bọc trong "items" (có phân trang).
      const list = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
      setExperts(list);
      hasLoadedOnce.current = true;
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(err?.response?.data?.message || "Could not load experts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchExperts(controller.signal);
    return () => controller.abort();
  }, [fetchExperts]);

  const showFullLoading = loading && experts.length === 0;

  return (
    <section className="py-20 px-6 max-w-6xl mx-auto">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Featured Experts</h2>
        <p className="text-gray-400 text-sm">
          Talented AI experts ready to work on your project
        </p>
      </div>

      {showFullLoading && (
        <div className="text-center py-16 text-gray-400">
          <span
            className="material-symbols-outlined block mb-3 text-cyan-400"
            style={{ fontSize: 40, animation: "spin 1s linear infinite" }}
          >
            autorenew
          </span>
          Loading experts...
        </div>
      )}

      {error && !showFullLoading && (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchExperts(new AbortController().signal)}
            className="px-5 py-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-400 text-sm"
          >
            Thử lại
          </button>
        </div>
      )}

      {!showFullLoading && !error && experts.length === 0 && (
        <p className="text-center text-gray-500 py-16">No experts yet.</p>
      )}

      {!showFullLoading && !error && experts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {experts.map((expert) => {
            const id = expert.expertProfileId ?? expert.userId;
            const name = expert.fullName ?? "Expert";
            const title = expert.professionalTitle ?? "AI Expert";
            const avatar =
              expert.avatarUrl || `https://i.pravatar.cc/120?u=${id}`;

            // skills: ưu tiên mảng expertSkills; nếu rỗng thì tách chuỗi "skills"
            let skillNames = [];
            if (Array.isArray(expert.expertSkills) && expert.expertSkills.length > 0) {
              skillNames = expert.expertSkills.map((s) => s.skillName);
            } else if (typeof expert.skills === "string" && expert.skills.trim()) {
              skillNames = expert.skills.split(",").map((s) => s.trim()).filter(Boolean);
            }

            const years = expert.yearsOfExperience ?? null;
            const score = expert.profileScore ?? null;
            const available = expert.availableForWork ?? false;
            const bio = expert.bio ?? null;
            const verified = expert.experienceVerificationStatus === "VERIFIED";

            // Chuẩn hoá nhãn level: "MID_LEVEL" → "MID"
            const rawLevel = expert.level ?? "";
            const levelLabel = rawLevel.replace("_LEVEL", "");

            return (
              <button
                key={id}
                type="button"
                onClick={onExpertClick}
                className="group relative text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.05] hover:-translate-y-0.5"
              >
                {levelLabel && (
                  <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-violet-400/10 border border-violet-400/25 text-violet-300 text-[10px] font-mono font-bold uppercase">
                    {levelLabel}
                  </span>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className="relative shrink-0">
                    <img
                      src={avatar}
                      alt={name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400/25"
                    />
                    {available && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-gray-950" />
                    )}
                  </div>
                  <div className="min-w-0 pr-14">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-white font-bold text-[15px] truncate">{name}</h3>
                      {verified && (
                        <span
                          className="material-symbols-outlined text-cyan-400 shrink-0"
                          style={{ fontSize: 15 }}
                          title="Verified experience"
                        >
                          verified
                        </span>
                      )}
                    </div>
                    <p className="text-cyan-300/80 text-xs font-mono truncate">{title}</p>
                  </div>
                </div>

                {bio && (
                  <p className="text-gray-400 text-[13px] leading-relaxed mb-3 line-clamp-2">
                    {bio}
                  </p>
                )}

                {(years != null || score != null) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[12px]">
                    {years != null && (
                      <span className="text-gray-400">{years} yrs exp</span>
                    )}
                    {score != null && (
                      <span className="text-gray-400">
                        Score: <span className="text-yellow-400">{score}</span>/100
                      </span>
                    )}
                  </div>
                )}

                {skillNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skillNames.slice(0, 4).map((sn, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full bg-cyan-400/8 border border-cyan-400/20 text-cyan-300 text-[11px] font-mono"
                      >
                        {sn}
                      </span>
                    ))}
                    {skillNames.length > 4 && (
                      <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[11px] font-mono">
                        +{skillNames.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-1.5 text-cyan-400 text-[12px] font-semibold opacity-0 group-hover:opacity-100 transition">
                  View profile
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                    arrow_forward
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();


  // Ép dark mode cố định (đã bỏ nút toggle sáng/tối).
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Mouse tracking cho hiệu ứng neon glow
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.querySelectorAll(".neon-glow").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width  / 2)) / 30;
        const dy = (e.clientY - (rect.top  + rect.height / 2)) / 30;
        el.style.boxShadow = `${dx}px ${dy}px 25px rgba(34, 211, 238, 0.2)`;
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const goLogin = () => navigate("/login");

  return (
    <div className="bg-gray-950 text-white min-h-screen">
      {/* Bỏ prop isDark/onToggleTheme — không còn nút sáng/tối */}
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <CategoriesSection />
        <ExpertsFromApi onExpertClick={goLogin} />
        <ProjectsSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  );
}