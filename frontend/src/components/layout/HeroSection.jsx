// components/HeroSection.jsx
// Phần đầu trang — tiêu đề lớn, mô tả, 2 nút CTA

export default function HeroSection() {
  return (
    // pt-40: tránh bị Navbar che (navbar cao 64px = h-16)
    // overflow-hidden: giữ blob nền không tràn ra ngoài
    <section className="relative pt-40 pb-24 px-4 md:px-12 overflow-hidden">

      {/* Blob nền (hiệu ứng ánh sáng mờ phía sau) */}
      {/* absolute + blur-[150px]: tạo vệt sáng mờ kiểu "glow" */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2
                      w-[1000px] h-[600px] bg-blue-600/10 blur-[150px]
                      -z-10 rounded-full" />

      {/* Nội dung chính — căn giữa */}
      <div className="max-w-4xl mx-auto text-center">

        {/* Badge nhỏ ở trên */}
        <div className="inline-block px-4 py-1.5 rounded-full border border-cyan-400/20
                        bg-cyan-400/5 text-cyan-400 text-xs font-mono mb-6 tracking-widest uppercase">
          The World's Elite AI Marketplace
        </div>

        {/* Tiêu đề chính */}
        {/* text-gradient là class custom trong index.css */}
        <h1 className="text-5xl md:text-7xl mb-8 leading-[1.1] font-black tracking-tight text-white">
          Scale Your Vision with{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400
                           bg-clip-text text-transparent">
            Neural Talent.
          </span>
        </h1>

        {/* Mô tả ngắn */}
        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
          Connecting global infrastructure leaders with elite researchers in
          Generative AI, LLMs, and Computer Vision to build the future.
        </p>

        {/* 2 nút CTA */}
        {/* flex-col trên mobile, flex-row trên sm+ */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="bg-cyan-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg
                             hover:scale-105 transition-all shadow-lg shadow-cyan-400/20">
            Hire AI Experts
          </button>
          <button className="bg-white/5 backdrop-blur-sm border border-white/10 px-8 py-4
                             rounded-xl font-bold text-lg text-white hover:bg-white/10 transition-all">
            Find AI Projects
          </button>
        </div>

      </div>
    </section>
  );
}