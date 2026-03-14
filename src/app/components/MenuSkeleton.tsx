/**
 * Skeleton loader for Customer Menu — instant FCP while data fetches.
 * Mimics the menu layout with animate-pulse placeholders.
 */
export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-white max-w-[600px] mx-auto shadow-lg" aria-hidden>
      {/* Hero image */}
      <div className="w-full p-4 pt-4 pb-0">
        <div className="w-full h-48 bg-gray-200 rounded-2xl animate-pulse" />
      </div>

      {/* Restaurant info block */}
      <div className="w-full px-6 py-5 flex gap-2 items-start">
        <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-gray-200 animate-pulse" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-white/95 border-b border-gray-200 px-4 py-4">
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-24 shrink-0 rounded-full bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Menu item cards */}
      <div className="flex flex-col pb-6 px-4 pt-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
            <div className="w-full h-[200px] bg-gray-200 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-1/5 bg-gray-200 rounded animate-pulse mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
