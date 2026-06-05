// src/modules/client/pages/ClientDashboard.jsx
// Trang chính của Client sau khi đăng nhập — danh sách AI Expert

import ClientLayout from "../../../components/layout/ClientLayout";

// ─── Dữ liệu mock ─────────────────────────────────────
const TOP_RATED = [
  { name: "Vector Architect",  match: "98%", rating: "5.0", projects: 54, level: "SENIOR", skills: ["PyTorch", "LLM Ops", "Transformers"] },
  { name: "Neural Architect",  match: "96%", rating: "4.9", projects: 42, level: "SENIOR", skills: ["TensorFlow", "CUDA", "GANs"] },
  { name: "Cognitive Lead",    match: "94%", rating: "4.8", projects: 67, level: "SENIOR", skills: ["NLP", "BERT", "HuggingFace"] },
];

const MOST_REVIEWED = [
  { name: "Prompt Engineer X", match: "95%", rating: "4.9", projects: 89, level: "SENIOR", skills: ["Prompt Eng", "GPT-4", "Claude"] },
  { name: "Logic Master",      match: "91%", rating: "4.7", projects: 104, level: "SENIOR", skills: ["Reinforcement", "Gym", "Unity ML"] },
  { name: "Visionary Dev",     match: "93%", rating: "4.8", projects: 76,  level: "SENIOR", skills: ["Computer Vision", "YOLO", "OpenCV"] },
];

const TRENDING = [
  { name: "Agentic Master",  match: "98%", rating: "4.9", projects: 34, level: "SENIOR", skills: ["AutoGPT", "BabyAGI", "LangGraph"] },
  { name: "LangChain Pro",   match: "99%", rating: "4.9", projects: 28, level: "SENIOR", skills: ["LangChain", "Vector DB", "RAG"] },
  { name: "Multimodal Dev",  match: "95%", rating: "4.8", projects: 21, level: "SENIOR", skills: ["CLIP", "Stable Diffusion", "Whisper"] },
];

// ─── Component con: 1 Expert Card ─────────────────────
function ExpertCard({ name, match, rating, projects, level, skills }) {
  return (
    // glass-card: class custom trong index.css
    <div className="glass-card p-6 rounded-xl flex flex-col space-y-6
                    hover:border-cyan-400 hover:-translate-y-1
                    hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-300">

      {/* Tên + role */}
      <div>
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <p className="text-xs font-mono text-cyan-400 tracking-wider mt-1">AI SPECIALIST</p>
      </div>

      {/* Grid stats */}
      <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/10">
        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">Rating</p>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-yellow-400 text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="text-sm font-bold text-white">{rating}</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">Experience</p>
          <p className="text-sm font-bold text-white">{level}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">Match Score</p>
          <p className="text-sm font-bold text-cyan-400">{match} MATCH</p>
        </div>
        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">Projects</p>
          <p className="text-sm font-bold text-white">{projects} COMPLETED</p>
        </div>
      </div>

      {/* Skills */}
      <div>
        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-3">
          Core Expertise
        </p>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span key={skill}
                  className="px-2 py-1 rounded text-[10px] font-mono
                             bg-cyan-400/10 text-[#d3fbff] border border-cyan-400/20">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto pt-4 flex gap-3">
        <button className="flex-1 py-2.5 bg-transparent border border-cyan-400 text-cyan-400
                           text-xs font-bold rounded-lg hover:bg-cyan-400/10 transition-all">
          Profile
        </button>
        <button className="flex-1 py-2.5 bg-cyan-400 text-gray-900
                           text-xs font-bold rounded-lg hover:brightness-110 transition-all">
          Connect
        </button>
      </div>
    </div>
  );
}

// ─── Component con: 1 Section experts ─────────────────
function ExpertSection({ title, icon, iconColor, experts }) {
  return (
    <section className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 border-l-4 border-cyan-400 pl-4">
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>

      {/* Grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experts.map((expert) => (
          <ExpertCard key={expert.name} {...expert} />
        ))}
      </div>
    </section>
  );
}

// ─── Page chính ───────────────────────────────────────
export default function ClientDashboard() {
  return (
    <ClientLayout>
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12 space-y-12">

        {/* Page header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-blue-400 tracking-tight">
            AI Expert Marketplace
          </h2>
          <p className="text-gray-400 max-w-2xl">
            Connect with top-tier artificial intelligence engineers, data scientists,
            and prompt engineers validated by AITasker.
          </p>
        </div>

        {/* 3 sections */}
        <div className="space-y-16">
          <ExpertSection
            title="Top Rated Experts"
            icon="star"
            iconColor="text-yellow-400"
            experts={TOP_RATED}
          />
          <ExpertSection
            title="Most Reviewed"
            icon="forum"
            iconColor="text-gray-400"
            experts={MOST_REVIEWED}
          />
          <ExpertSection
            title="Trending Experts"
            icon="trending_up"
            iconColor="text-cyan-400"
            experts={TRENDING}
          />
        </div>

      </section>
    </ClientLayout>
  );
}