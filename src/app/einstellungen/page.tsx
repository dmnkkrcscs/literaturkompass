'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { Download, Upload, Moon, Sun, Send, CheckCircle, XCircle } from 'lucide-react'
import { useTheme } from 'next-themes'

export default function EinstellungenPage() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)

  const { data: telegramStatus, isLoading: telegramLoading } = trpc.telegram.status.useQuery()
  const testMutation = trpc.telegram.testMessage.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast('Testnachricht gesendet! Prüfe Telegram.', 'success')
      } else {
        toast('Nachricht konnte nicht gesendet werden. Prüfe Bot-Token und Chat-ID.', 'error')
      }
    },
    onError: () => {
      toast('Fehler beim Senden der Testnachricht.', 'error')
    },
  })

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      const response = await fetch('/api/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `literaturkompass-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const handleImportV1Data = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/v1', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        alert(`${result.count} Einträge importiert`)
      }
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import fehlgeschlagen')
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Einstellungen
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Konfigurieren Sie Ihre Präferenzen
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Theme Settings */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Erscheinungsbild
            </h2>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black dark:text-white">
                    Theme
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Wählen Sie zwischen hellem und dunklem Theme
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={`rounded-lg p-2 transition-colors ${
                      theme === 'light'
                        ? 'bg-accent-light text-white'
                        : 'bg-light-surface dark:bg-dark-bg text-black dark:text-white'
                    }`}
                  >
                    <Sun className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`rounded-lg p-2 transition-colors ${
                      theme === 'dark'
                        ? 'bg-accent-dark text-white'
                        : 'bg-light-surface dark:bg-dark-bg text-black dark:text-white'
                    }`}
                  >
                    <Moon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Telegram Settings */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Benachrichtigungen
            </h2>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black dark:text-white">
                    Telegram Bot
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tägliches Briefing um 9:00 Uhr mit Deadlines, neuen Funden und Status.
                  </p>
                </div>

                <div>
                  {telegramLoading ? (
                    <Badge variant="default">Prüfe...</Badge>
                  ) : telegramStatus?.connected ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Badge variant="sage">Verbunden</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <Badge variant="default">Nicht verbunden</Badge>
                    </div>
                  )}
                </div>
              </div>

              {telegramStatus?.connected && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Bot: <span className="font-mono text-black dark:text-white">@{telegramStatus.botUsername}</span>
                    {' · '}Chat-ID: <span className="font-mono text-black dark:text-white">{telegramStatus.chatId}</span>
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => testMutation.mutate()}
                    loading={testMutation.isPending}
                  >
                    <Send className="mr-1 h-4 w-4" />
                    Testnachricht senden
                  </Button>
                </div>
              )}

              {!telegramLoading && !telegramStatus?.connected && (
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                  <p className="text-sm font-medium text-black dark:text-white">So verbindest du Telegram:</p>
                  <ol className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li>1. Erstelle einen Bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-accent-light dark:text-accent-dark underline">@BotFather</a></li>
                    <li>2. Schreibe dem Bot eine Nachricht, damit der Chat aktiv wird</li>
                    <li>3. Trage <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">TELEGRAM_BOT_TOKEN</code> und <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">TELEGRAM_CHAT_ID</code> in die Environment-Variablen ein</li>
                    <li>4. Redeploy — der Status wird automatisch geprüft</li>
                  </ol>
                  {telegramStatus?.reason && (
                    <p className="mt-2 text-xs text-red-500">{telegramStatus.reason}</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Data Management */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Datenverwaltung
            </h2>

            <div className="mt-4 space-y-4">
              {/* Export */}
              <div>
                <p className="font-medium text-black dark:text-white">
                  Daten exportieren
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Laden Sie Ihre Daten als JSON-Datei herunter
                </p>

                <Button
                  onClick={handleExportData}
                  loading={exportLoading}
                  variant="secondary"
                  className="mt-3"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportieren
                </Button>
              </div>

              {/* Import */}
              <div>
                <p className="font-medium text-black dark:text-white">
                  v1 Daten importieren
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Importieren Sie Ihre Daten aus Literaturkompass v1
                </p>

                <div className="mt-3">
                  <label className="block">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportV1Data}
                      disabled={importLoading}
                      className="hidden"
                    />
                    <Button
                      variant="secondary"
                      loading={importLoading}
                      className="cursor-pointer"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      JSON auswählen
                    </Button>
                  </label>
                </div>

                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Hinweis: Ein Migrations-Script steht zur Verfügung, um Ihre v1-Daten zu konvertieren.
                  Weitere Informationen finden Sie in der Dokumentation.
                </p>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Über
            </h2>

            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <strong>Literaturkompass</strong> v2.0
              </p>
              <p>
                Eine KI-gestützte Plattform zur Entdeckung und Verwaltung von
                Schreibwettbewerben.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
