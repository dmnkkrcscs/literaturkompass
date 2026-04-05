export default function Loading() {
  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div>
            <div className="h-8 w-48 rounded bg-gray-300 dark:bg-gray-700" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
