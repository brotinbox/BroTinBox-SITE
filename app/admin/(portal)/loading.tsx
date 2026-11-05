/**
 * Shown instantly inside the console layout (sidebar stays) while a page's
 * data loads. Also lets Next.js prefetch sidebar links up to this boundary.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-6">
        <div className="h-7 w-48 rounded-lg bg-gray-200" />
        <div className="h-4 w-80 max-w-full rounded bg-gray-100 mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[88px] rounded-2xl border border-gray-200 bg-white" />
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-4 rounded bg-gray-100" style={{ width: `${90 - i * 7}%` }} />
        ))}
      </div>
    </div>
  );
}
