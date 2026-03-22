'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      password,
      redirect: false,
    })

    if (result?.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Falsches Passwort')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-light-bg dark:bg-dark-bg">
      <div className="w-full max-w-sm">
        <div className="rounded-xl bg-light-surface p-8 shadow-lg dark:bg-dark-surface">
          <div className="mb-8 text-center">
            <span className="text-5xl">📚</span>
            <h1 className="mt-4 text-2xl font-bold text-black dark:text-white">
              Literaturkompass
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Bitte Passwort eingeben
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400 focus:border-accent-light focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              autoFocus
            />

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-lg bg-accent-light px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-accent-dark"
            >
              {loading ? 'Wird geprüft...' : 'Eintreten'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
