import AdminNavbar from "./AdminNavbar";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e1e2eb]">
      <AdminNavbar />

      <main>{children}</main>

      <footer className="mt-16 border-t border-white/10 bg-[#0b0f16] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center text-lg font-extrabold">
            <span className="text-[#00F0FF]">AI</span>
            <span className="ml-1 text-white">Tasker</span>
            <span className="ml-3 text-sm font-semibold text-gray-500">
              Admin Panel
            </span>
          </div>

          <p className="text-sm text-gray-500">
            Manage experts, projects, disputes and system activity.
          </p>
        </div>
      </footer>
    </div>
  );
}