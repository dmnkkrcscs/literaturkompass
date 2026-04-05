'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'

interface SubmitDialogProps {
  competitionId: string
  competitionName: string
  onClose: () => void
  onSuccess: () => void
}

export function SubmitDialog({ competitionId, competitionName, onClose, onSuccess }: SubmitDialogProps) {
  const [title, setTitle] = useState('')
  const [submittedAt, setSubmittedAt] = useState(
    new Date().toISOString().split('T')[0]
  )

  const submitMutation = trpc.submission.submit.useMutation({
    onSuccess: () => onSuccess(),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    submitMutation.mutate({
      competitionId,
      title: title.trim(),
      submittedAt: new Date(submittedAt),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-light-surface p-6 shadow-xl dark:bg-dark-surface">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Einreichung erfassen
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {competitionName}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Titel des eingereichten Textes
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Der Sturm hinter der Stille"
              required
              autoFocus
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Einreichdatum
            </label>
            <input
              type="date"
              value={submittedAt}
              onChange={(e) => setSubmittedAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitMutation.isPending}
              disabled={!title.trim()}
            >
              Einreichung speichern
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
