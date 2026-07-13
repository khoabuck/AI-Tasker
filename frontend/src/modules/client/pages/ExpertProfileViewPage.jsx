// src/modules/client/pages/ExpertProfileViewPage.jsx
//
// GET /api/experts/{expertProfileId} → chi tiết hồ sơ Expert (response thật đã xác nhận)
// {
//   expertProfileId, userId, fullName, email, avatarUrl, professionalTitle, bio,
//   skills (string nối dấu phẩy — field cũ, dùng expertSkills[] thay thế cho hiển thị),
//   yearsOfExperience, verifiedYearsOfExperience, experienceConfidenceScore,
//   experienceVerificationStatus, experienceVerificationNote, availableForWork,
//   portfolioUrl, linkedInUrl, gitHubUrl, expertCategory, profileScore, level,
//   profileReviewStatus, verifiedAt, createdAt, updatedAt,
//   expertSkills: [{ skillId, skillName, category, skillLevel, yearsOfExperience, isPrimary }],
//   certificates: []
// }

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import { clientExpertService } from "../../../services/clientExpert.service";
import axiosInstance from "../../../api/axiosInstance";
import { findExistingConversationWithExpert } from "../../../utils/conversation.util";

const SKILL_LEVEL_COLOR = {
  BEGINNER:     "text-gray-400",
  INTERMEDIATE: "text-yellow-400",
  ADVANCED:     "text-cyan-400",
  EXPERT:       "text-indigo-300",
};

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="material-symbols-outlined text-[18px] text-cyan-400" style={{ fontVariationSettings: "'FILL' 1" }}>
          {i <= Math.floor(rating) ? "star" : i - 0.5 <= rating ? "star_half" : "star_outline"}
        </span>
      ))}
    </div>
  );
}

function SocialLink({ icon, label, url }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-gray-300 transition-colors hover:border-cyan-400/40">
      <span className="material-symbols-outlined text-[18px] text-cyan-400">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="material-symbols-outlined text-[16px] text-gray-500">open_in_new</span>
    </a>
  );
}

export default function ExpertProfileViewPage() {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const { expertProfileId } = useParams();
  const navigate = useNavigate();

  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExpert = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const data = await clientExpertService.getExpertById(
        expertProfileId,
        { signal }
        );

        setExpert(data);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(
        err?.response?.status === 404 ? "Expert not found." :
        err?.response?.data?.message || "Unable to load expert profile."
      );
    } finally {
      setLoading(false);
    }
  }, [expertProfileId]);

  

  useEffect(() => {
    const controller = new AbortController();
    fetchExpert(controller.signal);
    return () => controller.abort();
  }, [fetchExpert]);

  // Đổi hành vi: KHÔNG còn tự tạo conversation + gửi tin nhắn soạn sẵn nữa
// (giống Connect ở AIMatchingPage / Invite ở ClientJobRecommendationPage).
// Có hội thoại cũ với expert này thì vào thẳng, chưa có thì đưa sang Messages
// kèm thông tin expert để user tự gõ và gửi tin đầu tiên.
  const handleConnect = async () => {
    if (!expert) return;
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

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
          <span className="material-symbols-outlined mb-4 animate-spin text-5xl text-cyan-400">autorenew</span>
          Loading profile...
        </div>
      </ClientLayout>
    );
  }

  if (error || !expert) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center px-6 py-32">
          <button
            onClick={() => navigate("/client/experts")}
            className="rounded-lg bg-cyan-400 px-6 py-2.5 font-bold text-[#101319] transition hover:brightness-110"
          >
            Back to search
          </button>
        </div>
      </ClientLayout>
    );
  }

  const rating = expert.profileScore ? expert.profileScore / 20 : 0;
  const isVerified = expert.experienceVerificationStatus === "VERIFIED";
  const expertSkills = Array.isArray(expert.expertSkills) ? expert.expertSkills : [];
  const certificates = Array.isArray(expert.certificates) ? expert.certificates : [];
 

  return (
    <ClientLayout>
      <div className="mx-auto max-w-[1000px] px-6 py-10">

        <button onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back 
        </button>

        {/* Header card */}
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-7 backdrop-blur-md">

          <div className="flex flex-wrap items-start gap-5">
            <img src={expert.avatarUrl || `https://i.pravatar.cc/120?u=${expert.expertProfileId}`} alt={expert.fullName}
              className="h-21 w-21 flex-shrink-0 rounded-full border-2 border-cyan-400/25 object-cover" style={{ width: 84, height: 84 }} />

            <div className="min-w-[200px] flex-1">
              <h1 className="mb-1 font-display text-2xl font-bold text-gray-100">{expert.fullName}</h1>
              <p className="mb-2.5 font-mono text-[13px] uppercase tracking-wide text-cyan-400">{expert.professionalTitle}</p>

              <div className="flex flex-wrap items-center gap-4">
                {rating > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={rating} />
                    <span className="font-mono text-[13px] text-gray-300">{expert.profileScore}/100</span>
                  </div>
                )}

                {expert.availableForWork && (
                  <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Available
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
                {expert.level && (
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-mono text-[11px] font-bold uppercase text-cyan-400">
                    {expert.level}
                    </span>
                )}

                <button
                    onClick={handleConnect}
                    className="whitespace-nowrap rounded-xl bg-cyan-400 px-8 py-3 font-display text-sm font-bold text-[#101319] shadow-[0_0_18px_rgba(0,240,255,0.35)] transition hover:brightness-110"
                >
                    Connect
                </button>
                </div>
          </div>

          {expert.bio && (
            <p className="mt-5 border-t border-white/[0.08] pt-5 text-sm leading-7 text-gray-300">
              {expert.bio}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[2fr_1fr]">

          {/* Left column */}
          <div className="flex flex-col gap-5">

            {/* Skills */}
            {expertSkills.length > 0 && (
              <div className="rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-7 backdrop-blur-md">
                <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">Skills</span>
                <div className="flex flex-col gap-2.5">
                  {expertSkills.map((s) => (
                    <div key={s.skillId} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-gray-100">{s.skillName}</span>
                        {s.isPrimary && (
                          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400">PRIMARY</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-gray-400">{s.yearsOfExperience} yrs</span>
                        <span className={`font-mono text-[10px] font-bold uppercase ${SKILL_LEVEL_COLOR[s.skillLevel] || "text-gray-400"}`}>
                          {s.skillLevel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience verification */}
            <div className="rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-7 backdrop-blur-md">
              <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">Experience</span>
              <div className={`mb-4 flex flex-wrap gap-7 ${expert.experienceVerificationNote ? "" : "mb-0"}`}>
                <div>
                  <p className="mb-1 text-[11px] text-gray-400">Stated</p>
                  <p className="font-mono text-xl font-bold text-gray-100">{expert.yearsOfExperience} yrs</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-gray-400">Verified</p>
                  <p className={`font-mono text-xl font-bold ${isVerified ? "text-green-400" : "text-yellow-400"}`}>{expert.verifiedYearsOfExperience} yrs</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-gray-400">Confidence</p>
                  <p className="font-mono text-xl font-bold text-indigo-300">{expert.experienceConfidenceScore}%</p>
                </div>
              </div>

            </div>

            {/* Certificates */}
            {certificates.length > 0 && (
              <div className="rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-7 backdrop-blur-md">
                <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">Certificates</span>
                <div className="flex flex-col gap-2.5">
                  {certificates.map((cert, i) => (
                    <div key={cert.certificateId ?? i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                      <p className="mb-0.5 text-[13px] font-semibold text-gray-100">{cert.certificateName || cert.name}</p>
                      {cert.issuedBy && <p className="text-[11px] text-gray-400">{cert.issuedBy}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">

            {/* Profile info */}
            <div className="rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-7 backdrop-blur-md">
              <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">Profile</span>
              <div className="flex flex-col gap-3.5">
                {expert.expertCategory && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Category</span>
                    <span className="text-xs font-semibold text-gray-300">{expert.expertCategory}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Review Status</span>
                  <span className={`text-xs font-semibold ${expert.profileReviewStatus === "APPROVED" ? "text-green-400" : "text-yellow-400"}`}>
                    {expert.profileReviewStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Member Since</span>
                  <span className="text-xs font-semibold text-gray-300">
                    {expert.createdAt ? new Date(expert.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Links */}
            {(expert.portfolioUrl || expert.linkedInUrl || expert.gitHubUrl) && (
              <div className="rounded-2xl border border-white/[0.12] bg-[#1d2026]/80 p-7 backdrop-blur-md">
                <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">Links</span>
                <div className="flex flex-col gap-2.5">
                  <SocialLink icon="language" label="Portfolio" url={expert.portfolioUrl} />
                  <SocialLink icon="person" label="LinkedIn" url={expert.linkedInUrl} />
                  <SocialLink icon="code" label="GitHub" url={expert.gitHubUrl} />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </ClientLayout>
  );
}