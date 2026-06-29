export default function Loading() {
  return (
    <div className="px-4 py-5 animate-pulse">
      <div className="h-7 w-32 bg-gray-100 rounded-lg mb-5" />
      <div className="space-y-6">
        <div>
          <div className="h-3 w-20 bg-gray-100 rounded mb-2" />
          <div className="space-y-2">
            <div className="h-12 bg-gray-100 rounded-xl" />
            <div className="h-12 bg-gray-100 rounded-xl" />
          </div>
        </div>
        <div>
          <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
          <div className="space-y-2">
            <div className="h-12 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
