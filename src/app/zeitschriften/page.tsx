'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { BookOpen, Plus, ChevronDown, ChevronRight, Pencil, Trash2, Calendar, Star, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { daysUntil, formatDateShort } from '@/lib/utils'
import Link from 'next/link'

export default function ZeitschriftenPage() {
  const { toast } = useToast()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddMagazine, setShowAddMagazine] = useState(false)
  const [showAddIssue, setShowAddIssue] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: magazines, isLoading, refetch } = trpc.magazine.list.useQuery()
  const createMutation = trpc.magazine.create.useMutation({
    onSuccess: () => { toast('Zeitschrift angelegt!', 'success'); setShowAddMagazine(false); refetch() },
  })
  const updateMutation = trpc.magazine.update.useMutation({
    onSuccess: () => { toast('Gespeichert!', 'success'); setEditingId(null); refetch() },
  })
  const deleteMutation = trpc.magazine.delete.useMutation({
    onSuccess: () => { toast('Zeitschrift gelöscht.', 'info'); refetch() },
  })
  const addIssueMutation = trpc.magazine.addIssue.useMutation({
    onSuccess: () => { toast('Ausgabe angelegt!', 'success'); setShowAddIssue(null); refetch() },
  })

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">Zeitschriften</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Magazine verwalten und Heft-Termine eintragen.
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowAddMagazine(true)}>
            <Plus className="mr-1 h-4 w-4" /> Neue Zeitschrift
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
                <div className="h-5 w-2/3 rounded bg-gray-300 dark:bg-gray-600" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
              </div>
            ))}
          </div>
        ) : !magazines || magazines.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Noch keine Zeitschriften angelegt.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {magazines.map(mag => {
              const isExpanded = expandedId === mag.id
              const isEditing = editingId === mag.id

              return (
                <div key={mag.id} className="rounded-lg border border-gray-200 bg-light-surface dark:border-gray-700 dark:bg-dark-surface">
                  {/* Magazine Header */}
                  <div className="flex items-center gap-3 p-5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : mag.id)}
                      className="text-gray-400 hover:text-black dark:hover:text-white"
                    >
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>

                    <div className="flex-1" onClick={() => setExpandedId(isExpanded ? null : mag.id)} role="button">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-black dark:text-white">{mag.name}</h3>
                        <Badge variant="gold">Zeitschrift</Badge>
                        {!mag.isActive && <Badge variant="default">Inaktiv</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                        {mag.location && <span>{mag.location}</span>}
                        <span>{mag._count.issues} Ausgabe{mag._count.issues !== 1 ? 'n' : ''}</span>
                        {mag.issues.length > 0 && mag.issues[0].deadline && (
                          <span>Nächste Deadline: {formatDateShort(new Date(mag.issues[0].deadline))}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <a href={mag.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button onClick={() => setEditingId(isEditing ? null : mag.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`"${mag.name}" wirklich löschen?`)) deleteMutation.mutate({ id: mag.id }) }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {isEditing && (
                    <EditMagazineForm
                      magazine={mag}
                      onSave={(data) => updateMutation.mutate({ id: mag.id, ...data })}
                      onCancel={() => setEditingId(null)}
                      loading={updateMutation.isPending}
                    />
                  )}

                  {/* Expanded Issues List */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">
                      {mag.issues.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Keine aktiven Ausgaben.</p>
                      ) : (
                        <div className="space-y-2">
                          {mag.issues.map(issue => {
                            const days = issue.deadline ? daysUntil(new Date(issue.deadline)) : null
                            const hasSubmission = issue.submissions && issue.submissions.length > 0

                            return (
                              <Link
                                key={issue.id}
                                href={`/wettbewerb/${issue.id}`}
                                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-black dark:text-white">
                                      {issue.theme || issue.name}
                                    </span>
                                    {hasSubmission && <Badge variant="submitted">Eingereicht</Badge>}
                                    {issue.starred && <Star className="h-3.5 w-3.5 fill-gold text-gold" />}
                                  </div>
                                </div>
                                {issue.deadline && (
                                  <span className={`text-sm font-medium ${
                                    days !== null && days <= 7 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    <Calendar className="mr-1 inline h-3.5 w-3.5" />
                                    {formatDateShort(new Date(issue.deadline))}
                                    {days !== null && days > 0 && ` (${days}d)`}
                                  </span>
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowAddIssue(mag.id)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Neue Ausgabe
                      </Button>
                    </div>
                  )}

                  {/* Add Issue Dialog */}
                  {showAddIssue === mag.id && (
                    <AddIssueDialog
                      magazineName={mag.name}
                      onSubmit={(data) => addIssueMutation.mutate({ magazineId: mag.id, ...data })}
                      onClose={() => setShowAddIssue(null)}
                      loading={addIssueMutation.isPending}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add Magazine Dialog */}
        {showAddMagazine && (
          <AddMagazineDialog
            onSubmit={(data) => createMutation.mutate(data)}
            onClose={() => setShowAddMagazine(false)}
            loading={createMutation.isPending}
          />
        )}
      </div>
    </main>
  )
}

// ============================================================================
// Inline Components
// ============================================================================

function AddMagazineDialog({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (data: { name: string; url: string; location?: string; description?: string; requirements?: string }) => void
  onClose: () => void
  loading: boolean
}) {
  const [form, setForm] = useState({ name: '', url: '', location: '', description: '', requirements: '' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-dark-surface">
        <h2 className="text-lg font-bold text-black dark:text-white">Neue Zeitschrift</h2>
        <div className="mt-4 space-y-3">
          <input
            placeholder="Name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
          />
          <input
            placeholder="URL (Einreichungsseite) *"
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
          />
          <input
            placeholder="Ort (z.B. Wien)"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
          />
          <textarea
            placeholder="Beschreibung"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
          />
          <input
            placeholder="Anforderungen"
            value={form.requirements}
            onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Abbrechen</Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={() => {
              if (!form.name || !form.url) return
              onSubmit({
                name: form.name,
                url: form.url,
                ...(form.location && { location: form.location }),
                ...(form.description && { description: form.description }),
                ...(form.requirements && { requirements: form.requirements }),
              })
            }}
          >
            Anlegen
          </Button>
        </div>
      </div>
    </div>
  )
}

function AddIssueDialog({
  magazineName,
  onSubmit,
  onClose,
  loading,
}: {
  magazineName: string
  onSubmit: (data: { theme: string; deadline: Date; requirements?: string }) => void
  onClose: () => void
  loading: boolean
}) {
  const [form, setForm] = useState({ theme: '', deadline: '', requirements: '' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-dark-surface">
        <h2 className="text-lg font-bold text-black dark:text-white">Neue Ausgabe — {magazineName}</h2>
        <div className="mt-4 space-y-3">
          <input
            placeholder="Thema / Hefttitel *"
            value={form.theme}
            onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
          />
          <input
            type="date"
            value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
          />
          <input
            placeholder="Spezifische Anforderungen (optional)"
            value={form.requirements}
            onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Abbrechen</Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={() => {
              if (!form.theme || !form.deadline) return
              onSubmit({
                theme: form.theme,
                deadline: new Date(form.deadline),
                ...(form.requirements && { requirements: form.requirements }),
              })
            }}
          >
            Anlegen
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditMagazineForm({
  magazine,
  onSave,
  onCancel,
  loading,
}: {
  magazine: { name?: string; url?: string; location?: string | null; description?: string | null; requirements?: string | null; genres?: string[] }
  onSave: (data: Record<string, any>) => void
  onCancel: () => void
  loading: boolean
}) {
  const [form, setForm] = useState({
    name: magazine.name || '',
    url: magazine.url || '',
    location: magazine.location || '',
    description: magazine.description || '',
    requirements: magazine.requirements || '',
  })

  return (
    <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">
      <div className="space-y-3">
        <input
          placeholder="Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
        />
        <input
          placeholder="URL"
          value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
        />
        <input
          placeholder="Ort"
          value={form.location}
          onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
        />
        <textarea
          placeholder="Beschreibung"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
        />
        <input
          placeholder="Anforderungen"
          value={form.requirements}
          onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>Abbrechen</Button>
        <Button variant="primary" size="sm" loading={loading} onClick={() => onSave(form)}>Speichern</Button>
      </div>
    </div>
  )
}
