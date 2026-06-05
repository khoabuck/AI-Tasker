// components/ExpertsSection.jsx
// Hiển thị danh sách Expert nổi bật dạng card

// ─── Dữ liệu ─────────────────────────────────────────
// accentColor: màu chủ đạo của từng expert card
// Tailwind không cho phép tạo class động (vd: `text-${color}`)
// nên phải viết class đầy đủ ở đây (đây là quy tắc quan trọng!)
const EXPERTS = [
  {
    name: "Dr. Aris Thorne",
    role: "LLM Infrastructure",
    rating: "5.0",
    bio: "Architect of large-scale distributed training systems and LLMOps pipelines for enterprise AI deployment.",
    skills: ["LLMOps", "Distributed Training"],
    // Class Tailwind phải viết đầy đủ, không được nối chuỗi
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

// ─── Component con: 1 expert card ────────────────────
function ExpertCard({ name, role, rating, bio, skills,
                      accentText, accentBorder, skillBg,
                      cardHover, btnStyle }) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10
                     ${cardHover} rounded-2xl p-8 transition-all`}>

      {/* Hàng trên: avatar + tên + rating */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">

          {/* Avatar placeholder (icon) */}
          <div className={`w-14 h-14 rounded-full bg-white/5 border
                           ${accentBorder} flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-3xl ${accentText}`}>
              account_circle
            </span>
          </div>

          {/* Tên và role */}
          <div>
            <h3 className="font-bold text-lg text-white">{name}</h3>
            <p className={`text-xs font-mono tracking-wider ${accentText}`}>{role}</p>
          </div>

        </div>

        {/* Rating badge */}
        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-xs font-bold text-white">
          {/* FILL 1 = icon filled (ngôi sao đầy) */}
          <span className="material-symbols-outlined text-[14px] text-yellow-400"
                style={{ fontVariationSettings: "'FILL' 1" }}>
            star
          </span>
          {rating}
        </div>
      </div>

      {/* Mô tả ngắn */}
      {/* line-clamp-3: giới hạn 3 dòng, thêm "..." nếu dài hơn */}
      <p className="text-gray-400 text-sm mb-6 line-clamp-3">{bio}</p>

      {/* Skill tags */}
      <div className="flex flex-wrap gap-2 mb-8">
        {skills.map((skill) => (
          <span key={skill}
                className={`px-2 py-1 border text-[10px] font-mono rounded uppercase ${skillBg}`}>
            {skill}
          </span>
        ))}
      </div>

      {/* Nút xem profile */}
      <button className={`w-full py-3 rounded-xl border font-bold transition-all ${btnStyle}`}>
        View Full Profile
      </button>

    </div>
  );
}

// ─── Component cha ────────────────────────────────────
export default function ExpertsSection() {
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
          <a href="#" className="text-cyan-400 font-bold flex items-center gap-2 hover:underline shrink-0">
            Browse all experts
            <span className="material-symbols-outlined">east</span>
          </a>
        </div>

        {/* Grid cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXPERTS.map((expert) => (
            <ExpertCard key={expert.name} {...expert} />
          ))}
        </div>

      </div>
    </section>
  );
}