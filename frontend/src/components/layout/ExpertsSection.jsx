// components/layout/ExpertsSection.jsx
import { useNavigate } from "react-router-dom";

const EXPERTS = [
  {
    name: "Dr. Aris Thorne",
    role: "LLM Infrastructure",
    rating: "5.0",
    bio: "Architect of large-scale distributed training systems and LLMOps pipelines for enterprise AI deployment.",
    skills: ["LLMOps", "Distributed Training"],
    accentText:   "text-cyan-400",
    accentBorder: "border-cyan-400",
    skillBg:      "bg-cyan-400/5 border-cyan-400/20 text-cyan-400",
    cardHover:    "hover:border-cyan-400",
    btnStyle:     "border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10",
  },
  {
    name: "Elena Kostic",
    role: "Generative AI",
    rating: "4.9",
    bio: "Specialist in diffusion model fine-tuning and creative AI systems for media and entertainment industries.",
    skills: ["Stable Diffusion", "GANs"],
    accentText:   "text-blue-400",
    accentBorder: "border-blue-400",
    skillBg:      "bg-blue-400/5 border-blue-400/20 text-blue-400",
    cardHover:    "hover:border-blue-400",
    btnStyle:     "border-blue-400/30 text-blue-400 hover:bg-blue-400/10",
  },
  {
    name: "Marcus Vane",
    role: "RAG & Agents",
    rating: "5.0",
    bio: "Builds production-grade RAG pipelines and agentic workflows using LangChain and custom retrieval systems.",
    skills: ["LangChain", "RAG"],
    accentText:   "text-violet-400",
    accentBorder: "border-violet-400",
    skillBg:      "bg-violet-400/5 border-violet-400/20 text-violet-400",
    cardHover:    "hover:border-violet-400",
    btnStyle:     "border-violet-400/30 text-violet-400 hover:bg-violet-400/10",
  },
];

function ExpertCard({ name, role, rating, bio, skills,
                      accentText, accentBorder, skillBg,
                      cardHover, btnStyle, onViewProfile }) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10
                     ${cardHover} rounded-2xl p-8 transition-all`}>

      {/* Hàng trên: avatar + tên + rating */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full bg-white/5 border
                           ${accentBorder} flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-3xl ${accentText}`}>
              account_circle
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">{name}</h3>
            <p className={`text-xs font-mono tracking-wider ${accentText}`}>{role}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-xs font-bold text-white">
          <span className="material-symbols-outlined text-[14px] text-yellow-400"
                style={{ fontVariationSettings: "'FILL' 1" }}>
            star
          </span>
          {rating}
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-6 line-clamp-3">{bio}</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {skills.map((skill) => (
          <span key={skill}
                className={`px-2 py-1 border text-[10px] font-mono rounded uppercase ${skillBg}`}>
            {skill}
          </span>
        ))}
      </div>

      <button
        onClick={onViewProfile}
        className={`w-full py-3 rounded-xl border font-bold transition-all ${btnStyle}`}
      >
        View Full Profile
      </button>
    </div>
  );
}

export default function ExpertsSection() {
  const navigate = useNavigate();

  return (
    <section className="px-4 md:px-12 py-24">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Elite AI Talent
            </h2>
            <p className="text-gray-400">
              Top-rated specialists vetted through our rigorous technical screening.
            </p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="text-cyan-400 font-bold flex items-center gap-2 hover:underline shrink-0 bg-transparent border-none cursor-pointer"
          >
            Browse all experts
            <span className="material-symbols-outlined">east</span>
          </button>
        </div>

        {/* Grid cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXPERTS.map((expert) => (
            <ExpertCard
              key={expert.name}
              {...expert}
              onViewProfile={() => navigate("/login")}
            />
          ))}
        </div>

      </div>
    </section>
  );
}