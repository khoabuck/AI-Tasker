// components/CategoriesSection.jsx
// Hiển thị 3 lĩnh vực AI chính dưới dạng card

// ─── Dữ liệu ─────────────────────────────────────────
// Mỗi object = 1 card. Thêm/bỏ card chỉ cần sửa mảng này.
const CATEGORIES = [
  {
    icon: "psychology",           // tên icon từ Material Symbols
    title: "Natural Language Processing",
    description: "LLM training, fine-tuning, RAG architectures, and agentic workflows for enterprise scale.",
    tags: ["RAG", "GPT-4", "LLMops"],
  },
  {
    icon: "auto_awesome",
    title: "Generative AI & LLM",
    description: "Text-to-image, creative synthesis, and foundational model development for unique content generation.",
    tags: ["Diffusion", "GANs", "Synthesis"],
  },
  {
    icon: "visibility",
    title: "Computer Vision",
    description: "Advanced object detection, image segmentation, and facial recognition systems for real-world applications.",
    tags: ["OpenCV", "YOLO", "CNNs"],
  },
];

// ─── Component con: 1 card ────────────────────────────
// Nhận props từ mảng CATEGORIES phía trên
function CategoryCard({ icon, title, description, tags }) {
  return (
    // group: cho phép dùng group-hover: trên các phần tử con
    <div className="bg-white/5 backdrop-blur-sm border border-white/10
                    hover:border-cyan-400/50 rounded-2xl p-8 transition-all group">

      {/* Icon */}
      {/* group-hover:scale-110: icon phóng to nhẹ khi hover cả card */}
      <div className="w-14 h-14 rounded-xl bg-cyan-400/10 flex items-center justify-center
                      mb-6 text-cyan-400 group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>

      {/* Tiêu đề */}
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>

      {/* Mô tả */}
      <p className="text-gray-400 text-sm leading-relaxed mb-6">{description}</p>

      {/* Tags — dùng .map() để render từng tag */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag}
                className="text-[10px] font-mono bg-white/5 text-gray-300
                           px-2 py-1 rounded uppercase tracking-wider">
            {tag}
          </span>
        ))}
      </div>

    </div>
  );
}

// ─── Component cha: toàn bộ section ──────────────────
export default function CategoriesSection() {
  return (
    <section className="px-4 md:px-12 py-24 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto">

        {/* Header section */}
        <div className="mb-16 flex flex-col md:flex-row justify-between items-end gap-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Core Focus Areas
          </h2>
          <p className="text-gray-400 max-w-xl">
            Deep domain expertise across the most critical domains of modern artificial intelligence.
          </p>
          <a href="#" className="inline-flex items-center gap-2 text-cyan-400 font-bold hover:underline shrink-0">
            View All
            <span className="material-symbols-outlined">east</span>
          </a>
        </div>

        {/* Grid các card — tự động wrap, 3 cột trên desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => (
            // key bắt buộc khi dùng .map() trong React
            <CategoryCard key={cat.title} {...cat} />
          ))}
        </div>

      </div>
    </section>
  );
}