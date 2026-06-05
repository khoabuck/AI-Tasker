// components/HowItWorksSection.jsx
// 3 bước hoạt động của nền tảng

// ─── Dữ liệu ─────────────────────────────────────────
const STEPS = [
  {
    num: "1",
    title: "Define Scope",
    desc: "Post your technical requirements or browse our curated expert directory.",
    borderColor: "border-cyan-400/30",
    textColor: "text-cyan-400",
  },
  {
    num: "2",
    title: "Match & Hire",
    desc: "Review technical proposals, interview candidates, and hire with confidence.",
    borderColor: "border-blue-400/30",
    textColor: "text-blue-400",
  },
  {
    num: "3",
    title: "Build & Scale",
    desc: "Track milestones and release payments through our secure escrow system.",
    borderColor: "border-violet-400/30",
    textColor: "text-violet-400",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="px-4 md:px-12 py-24">
      <div className="max-w-7xl mx-auto">

        {/* Header căn giữa */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Streamlined Collaboration
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Getting your AI project from vision to production is simpler than ever.
          </p>
        </div>

        {/* Grid 3 bước */}
        {/* relative: để có thể đặt đường kết nối giữa các bước (position absolute) */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 text-center">

          {/* Đường ngang kết nối giữa 3 bước — chỉ hiện trên md+ */}
          {/* after: pseudo-element tạo đường gradient ngang */}
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px
                          bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

          {STEPS.map((step) => (
            <div key={step.num} className="relative z-10">

              {/* Hộp số thứ tự */}
              <div className={`w-16 h-16 rounded-2xl bg-white/5 border-2 ${step.borderColor}
                               flex items-center justify-center ${step.textColor}
                               text-2xl font-black mx-auto mb-6`}>
                {step.num}
              </div>

              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-gray-400 text-sm">{step.desc}</p>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}