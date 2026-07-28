import AdminNavbar from "./AdminNavbar";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0d1117] text-[#e1e2eb]">
      <AdminNavbar />

      <div className="flex min-h-screen min-w-0 flex-col md:pl-[280px]">
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 md:px-8">
          {children}
        </main>

        <footer className="border-t border-white/10 bg-[#0b0f16] px-4 py-6 sm:px-6 md:px-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center text-lg font-extrabold">
              <span className="text-[#00F0FF]">AI</span>
              <span className="ml-1 text-white">Tasker</span>
              <span className="ml-3 text-sm font-semibold text-gray-500">
                Admin Panel
              </span>
            </div>

            <p className="text-sm text-gray-500">
              Manage experts, jobs, disputes and system activity.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}