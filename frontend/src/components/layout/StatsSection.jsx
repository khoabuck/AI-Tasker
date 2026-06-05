// components/StatsSection.jsx
// Hiển thị 3 con số thống kê nổi bật

// Dữ liệu tách ra ngoài component để dễ chỉnh sửa sau
// Khi có API thật, thay mảng này bằng dữ liệu fetch về
const STATS = [
  { value: "12k+",  label: "Verified Experts", highlight: true  },
  { value: "5.4k+", label: "Active Projects",  highlight: false },
  { value: "99.8%", label: "Success Rate",     highlight: false },
];

export default function StatsSection() {
  return (
    <section className="px-4 md:px-12 pb-24">
      <div className="max-w-7xl mx-auto">

        {/* Card kính (glassmorphism) */}
        <div className="bg-white/5 backdrop-blur-md border border-cyan-400/20
                        rounded-3xl p-10 md:p-16">

          {/* Grid 1 cột mobile → 3 cột desktop */}
          {/* divide-x: đường kẻ dọc ngăn giữa các cột (chỉ hiện trên md+) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center
                          divide-y md:divide-y-0 md:divide-x divide-white/10">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-4 py-4 md:py-0">

                {/* Số lớn — cyan nếu highlight, trắng nếu không */}
                <div className={`text-4xl md:text-5xl font-bold mb-2
                                 ${stat.highlight ? "text-cyan-400" : "text-white"}`}>
                  {stat.value}
                </div>

                {/* Nhãn nhỏ bên dưới */}
                <div className="text-gray-400 text-sm uppercase tracking-widest font-mono">
                  {stat.label}
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}