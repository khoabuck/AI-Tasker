// components/ProjectsSection.jsx
// Danh sách các project đang tuyển Expert

// ─── Dữ liệu ─────────────────────────────────────────
const PROJECTS = [
  {
    badge: "Urgent",
    badgeStyle: "bg-cyan-400/10 text-cyan-400",
    posted: "2 hours ago",
    title: "Build Specialized RAG Architecture for Medical Records",
    titleHover: "group-hover:text-cyan-400",
    cardHover: "hover:border-cyan-400",
    budget: "$5,000 - $8,000",
    timeline: "1-2 Months",
    location: "Remote",
    proposals: "12 Active",
    btnHover: "hover:bg-cyan-400 hover:text-gray-900",
  },
  {
    badge: "Full-Time Contract",
    badgeStyle: "bg-blue-400/10 text-blue-400",
    posted: "1 day ago",
    title: "Optimize Stable Diffusion Inference for Edge Devices",
    titleHover: "group-hover:text-blue-400",
    cardHover: "hover:border-blue-400",
    budget: "$12,000+ Fixed",
    timeline: "3+ Months",
    location: "Remote / Hybrid",
    proposals: "5 Active",
    btnHover: "hover:bg-blue-400 hover:text-white",
  },
];

// ─── Component con: 1 dòng project ───────────────────
function ProjectCard({
  badge, badgeStyle, posted, title, titleHover,
  cardHover, budget, timeline, location, proposals, btnHover,
}) {
  return (
    // group: để dùng group-hover: cho tiêu đề bên trong
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 ${cardHover}
                     rounded-2xl p-6 md:p-8 transition-all
                     flex flex-col md:flex-row md:items-center justify-between gap-6 group`}>

      {/* Phần trái: thông tin project */}
      <div className="flex-1">

        {/* Badge + thời gian đăng */}
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${badgeStyle}`}>
            {badge}
          </span>
          <span className="text-gray-400 text-xs">Posted {posted}</span>
        </div>

        {/* Tiêu đề project — đổi màu khi hover cả card (group-hover) */}
        <h3 className={`text-xl font-bold text-white ${titleHover} transition-colors mb-2`}>
          {title}
        </h3>

        {/* Thông tin: budget, timeline, địa điểm */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">payments</span>
            {budget}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">schedule</span>
            {timeline}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">location_on</span>
            {location}
          </span>
        </div>
      </div>

      {/* Phần phải: số proposals + nút Apply */}
      <div className="flex items-center gap-4">

        {/* Chỉ hiện trên màn hình lớn */}
        <div className="text-right hidden lg:block">
          <div className="text-xs text-gray-400 uppercase font-mono tracking-wider">Proposals</div>
          <div className="text-sm font-bold text-white">{proposals}</div>
        </div>

        <button className={`bg-white/10 px-6 py-3 rounded-xl font-bold text-white
                            transition-all ${btnHover}`}>
          Apply Now
        </button>

      </div>
    </div>
  );
}

// ─── Component cha ────────────────────────────────────
export default function ProjectsSection() {
  return (
    <section className="px-4 md:px-12 py-24 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              High-Value AI Projects
            </h2>
            <p className="text-gray-400">
              Active listings from global tech leaders and innovative startups.
            </p>
          </div>
          <a href="#" className="text-blue-400 font-bold flex items-center gap-2 hover:underline shrink-0">
            View all listings
            <span className="material-symbols-outlined">east</span>
          </a>
        </div>

        {/* Danh sách project — space-y-4: khoảng cách dọc giữa các card */}
        <div className="space-y-4">
          {PROJECTS.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>

      </div>
    </section>
  );
}