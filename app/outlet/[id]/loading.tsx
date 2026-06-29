export default function Loading() {
  return (
    <div className="px-4 py-5 pb-36 animate-pulse">
      <div className="h-4 w-10 bg-gray-100 rounded mb-5" />
      <div className="h-7 w-48 bg-gray-100 rounded-lg mb-5" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="flex-none w-[18px] h-[18px] rounded-[3px] bg-gray-100" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
            <div className="flex-none h-8 w-14 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
