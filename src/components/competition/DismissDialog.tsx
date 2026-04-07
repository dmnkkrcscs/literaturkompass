'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'

interface DismissDialogProps {
  competitionId: string
  competitionName: string
  onClose: () => void
  onSuccess: () => void
}

const quickReasons = [
  'Duplikat',
  'Falsches Genre',
  'Zu teuer',
  'Zu kurze Deadline',
  'Nicht mein Thema',
  'Altersbeschränkung',
  'Regionalbeschränkung',
  'Unseriös',
]

export function DismissDialog({ competitionId, competitionName, onClose, onSuccess }: DismissDialogProps) {
  const [reason, setReason] = useState('')

  const dismissMutation = trpc.competition.dismiss.useMutation({
    onSuccess: () => onSuccess(),
  })

  const handleDismiss = (dismissReason?: string) => {
    dismissMutation.mutate({
      id: competitionId,
      reason: dismissReason || reason || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-light-surface p-6 shadow-xl dark:bg-dark-surface">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Ausblenden
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {competitionName}
        </p>

        {/* Quick reasons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {quickReasons.map((qr) => (
            <button
              key={qr}
              onClick={() => setReason(qr)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                reason === qr
                  ? 'border-accent-light bg-accent-light/10 text-accent-light dark:border-accent-dark dark:bg-accent-dark/10 dark:text-accent-dark'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-400'
              }`}
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Custom reason */}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Oder eigene Begründung schreiben... (optional)"
          rows={3}
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-500"
        />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleDismiss()}
            disabled={dismissMutation.isPending}
          >
            Ohne Begründung
          </Button>
          <Button
            variant="danger"
            onClick={() => handleDismiss(reason)}
            loading={dismissMutation.isPending}
            disabled={!reason}
          >
            Ausblenden
          </Button>
        </div>
      </div>
    </div>
  )
}
