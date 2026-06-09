import AdminNavbar from "./AdminNavbar";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e1e2eb]">
      <AdminNavbar />

      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#0d1117]/95 px-5 backdrop-blur-xl md:hidden">
        <div className="inline-flex items-center text-xl font-extrabold">
          <span className="text-[#00F0FF]">AI</span>
          <span className="ml-1 text-white">Tasker</span>

          <span className="ml-3 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
            Admin
          </span>
        </div>
      </div>

      {/* Main content */}
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,240,255,0.08),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.08),transparent_35%)] md:ml-72">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}