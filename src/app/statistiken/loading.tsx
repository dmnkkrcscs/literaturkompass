export default function Loading() {
  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-8">
          <div>
            <div className="h-8 w-48 rounded bg-gray-300 dark:bg-gray-700" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    </main>
  )
}
