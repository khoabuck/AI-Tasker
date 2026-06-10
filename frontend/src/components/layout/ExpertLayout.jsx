import ExpertNavbar from "./ExpertNavbar";

export default function ExpertLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e1e2eb]">
      <ExpertNavbar />

      <main>{children}</main>

      <footer className="mt-16 border-t border-white/10 bg-[#0b0f16] px-5 py-10 md:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="mb-3 inline-flex items-center text-lg font-extrabold">
              <span className="text-[#00F0FF]">AI</span>
              <span className="ml-1 text-white">Tasker</span>
            </div>

            <p className="max-w-xs text-sm leading-6 text-gray-500">
              Connect experts with AI projects, proposals, milestones and
              deliverables.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white">
              Expert
            </h3>
            <div className="space-y-2 text-sm text-gray-500">
              <p>Browse Jobs</p>
              <p>My Proposals</p>
              <p>My Projects</p>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white">
              Support
            </h3>
            <div className="space-y-2 text-sm text-gray-500">
              <p>Messages</p>
              <p>Disputes</p>
              <p>Notifications</p>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white">
              Social
            </h3>

            <div className="flex gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-400">
                in
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-400">
                gh
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-400">
                x
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}