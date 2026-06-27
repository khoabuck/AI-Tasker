export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#0B0F14] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl items-center">
        <section className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
          <div className="relative p-8 md:p-12">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />

            <div className="relative max-w-5xl">
              <div className="mb-12 inline-flex items-center gap-3 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-6 py-3 text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
                <span className="material-symbols-outlined text-[20px]">
                  error
                </span>
                Page Not Found
              </div>

              <h1 className="text-7xl font-black tracking-tight text-white md:text-9xl">
                404
              </h1>

              <h2 className="mt-8 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
                This page does not exist or has been moved
              </h2>

              <p className="mt-8 max-w-5xl text-base leading-8 text-gray-400 md:text-xl">
                The link you opened may be incorrect, expired, or no longer
                available. You can return to your workspace or go back to the
                previous page.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}