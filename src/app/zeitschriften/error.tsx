'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-black dark:text-white">
          Laden fehlgeschlagen
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {error.message || 'Die Seite konnte nicht geladen werden.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>
            Erneut versuchen
          </Button>
          <Button variant="secondary" onClick={() => window.location.href = '/'}>
            Zur Startseite
          </Button>
        </div>
      </div>
    </main>
  )
}
