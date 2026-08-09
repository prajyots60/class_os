export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 font-sans text-slate-100 p-6">
      <main className="flex max-w-xl flex-col items-center justify-center text-center space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-12 backdrop-blur-sm shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-400">
          Phase 0.1 Milestone
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          CoachingOS
        </h1>
        <p className="text-xl font-medium text-slate-400">
          Engineering Foundation
        </p>
        <div className="pt-4 text-xs text-slate-500">
          Modular Monolith Architecture Baseline
        </div>
      </main>
    </div>
  );
}

