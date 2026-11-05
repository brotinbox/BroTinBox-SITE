/** Placeholder for customer account pages while their data loads. */
export function AccountSkeleton() {
  return (
    <div className="min-h-screen bg-paper pb-28" aria-busy="true" aria-label="Loading">
      <div className="max-w-3xl mx-auto px-4 pt-6 animate-pulse">
        <div className="h-7 w-40 rounded-lg bg-ink/10" />
        <div className="h-4 w-64 max-w-full rounded bg-ink/5 mt-2" />
        <div className="flex gap-2 mt-4 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 rounded-full bg-ink/5" />
          ))}
        </div>
        <div className="space-y-3 mt-6">
          <div className="h-20 rounded-2xl bg-white border border-ink/10" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="h-24 rounded-2xl bg-white border border-ink/10" />
            <div className="h-24 rounded-2xl bg-white border border-ink/10" />
          </div>
          <div className="h-40 rounded-2xl bg-white border border-ink/10" />
        </div>
      </div>
    </div>
  );
}
