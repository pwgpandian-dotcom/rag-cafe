export default function Loading() {
  return (
    <div className="px-4 py-5 animate-pulse">
      <div className="h-7 w-36 bg-gray-100 rounded-lg mb-5" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-14 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
