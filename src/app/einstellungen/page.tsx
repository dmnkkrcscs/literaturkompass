'use client'

import { useEffect, useState } from 'react'
import { Download, Upload, Moon, Sun, Send, CheckCircle, XCircle, RotateCw, Sparkles } from 'lucide-react'
import { useTheme } from 'next-themes'

interface Preferences {
  bio: string
  favoriteGenres: string[]
  favoriteThemes: string[]
  dislikedTopics: string[]
  location: string
}

export default function EinstellungenPage() {
  const { theme, setTheme } = useTheme()
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [telegramConfigured, setTelegramConfigured] = useState<boolean | null>(null)
  const [telegramTest, setTelegramTest] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [telegramError, setTelegramError] = useState('')

  // KI-Profil
  const [prefs, setPrefs] = useState<Preferences>({
    bio: '',
    favoriteGenres: [],
    favoriteThemes: [],
    dislikedTopics: [],
    location: '',
  })
  const [prefsRaw, setPrefsRaw] = useState({ genres: '', themes: '', disliked: '' })
  const [prefsSave, setPrefsSave] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/telegram')
      .then((r) => r.json())
      .then((d) => setTelegramConfigured(d.configured ?? false))
      .catch(() => setTelegramConfigured(false))

    fetch('/api/preferences')
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) {
          setPrefs(d.preferences)
          setPrefsRaw({
            genres: (d.preferences.favoriteGenres || []).join(', '),
            themes: (d.preferences.favoriteThemes || []).join(', '),
            disliked: (d.preferences.dislikedTopics || []).join(', '),
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleSavePrefs = async () => {
    setPrefsSave('saving')
    try {
      const body = {
        ...prefs,
        favoriteGenres: prefsRaw.genres.split(',').map((s) => s.trim()).filter(Boolean),
        favoriteThemes: prefsRaw.themes.split(',').map((s) => s.trim()).filter(Boolean),
        dislikedTopics: prefsRaw.disliked.split(',').map((s) => s.trim()).filter(Boolean),
      }
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setPrefsSave(res.ok ? 'ok' : 'error')
      setTimeout(() => setPrefsSave('idle'), 2500)
    } catch {
      setPrefsSave('error')
      setTimeout(() => setPrefsSave('idle'), 2500)
    }
  }

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
      const response = await fetch('/api/import/v1', { method: 'POST', body: formData })
      if (response.ok) {
        const result = await response.json()
        alert(`${result.count} Einträge importiert`)
      }
    } catch {
      alert('Import fehlgeschlagen')
    } finally {
      setImportLoading(false)
    }
  }

  const handleTelegramTest = async () => {
    setTelegramTest('loading')
    setTelegramError('')
    try {
      const res = await fetch('/api/telegram', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setTelegramTest('ok')
      } else {
        setTelegramTest('error')
        setTelegramError(data.error || 'Unbekannter Fehler')
      }
    } catch {
      setTelegramTest('error')
      setTelegramError('Verbindungsfehler')
    }
  }

  return (
    <main className="min-h-screen bg-lit-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Konfiguration</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Einstellungen</h1>
        </div>

        <div className="space-y-4">

          {/* ── Erscheinungsbild ── */}
          <section className="rounded-2xl bg-white dark:bg-dark-surface shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Erscheinungsbild</h2>
            </div>
            <div className="px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Theme</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hell oder dunkel</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    theme === 'light'
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-lit-muted dark:bg-dark-muted text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-muted/80'
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  Hell
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-lit-muted dark:bg-dark-muted text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-muted/80'
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  Dunkel
                </button>
              </div>
            </div>
          </section>

          {/* ── KI-Profil ── */}
          <section className="rounded-2xl bg-white dark:bg-dark-surface shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">KI-Empfehlungsprofil</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Je mehr die KI über dein Schreiben weiß, desto besser trifft sie Empfehlungen. Zusätzlich lernt sie automatisch aus deinen Einreichungen und markierten Ausschreibungen.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Über mich & meinen Schreibstil</label>
                <textarea
                  value={prefs.bio}
                  onChange={(e) => setPrefs((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="z.B. Ich schreibe hauptsächlich literarische Kurzprosa und Lyrik mit einem Fokus auf Stille, Verlust und Naturbeobachtung. Bisher veröffentlicht in manuskripte und bella triste."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Bevorzugte Genres</label>
                  <input
                    type="text"
                    value={prefsRaw.genres}
                    onChange={(e) => setPrefsRaw((r) => ({ ...r, genres: e.target.value }))}
                    placeholder="Kurzprosa, Lyrik, Essay"
                    className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Kommagetrennt</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Bevorzugte Themen</label>
                  <input
                    type="text"
                    value={prefsRaw.themes}
                    onChange={(e) => setPrefsRaw((r) => ({ ...r, themes: e.target.value }))}
                    placeholder="Natur, Verlust, Erinnerung, Stille"
                    className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Kommagetrennt</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Nicht interessant</label>
                  <input
                    type="text"
                    value={prefsRaw.disliked}
                    onChange={(e) => setPrefsRaw((r) => ({ ...r, disliked: e.target.value }))}
                    placeholder="Krimi, Fantasy, Jugendliteratur"
                    className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Kommagetrennt</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Wohnort (für regionale Wettbewerbe)</label>
                  <input
                    type="text"
                    value={prefs.location}
                    onChange={(e) => setPrefs((p) => ({ ...p, location: e.target.value }))}
                    placeholder="z.B. Wien, Österreich"
                    className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSavePrefs}
                  disabled={prefsSave === 'saving'}
                  className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all"
                >
                  {prefsSave === 'saving' ? <RotateCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Profil speichern
                </button>
                {prefsSave === 'ok' && <span className="text-xs text-sage flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Gespeichert!</span>}
                {prefsSave === 'error' && <span className="text-xs text-red-500">Fehler beim Speichern</span>}
              </div>
            </div>
          </section>

          {/* ── Telegram ── */}
          <section className="rounded-2xl bg-white dark:bg-dark-surface shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Telegram-Benachrichtigungen</h2>
              {telegramConfigured === null ? (
                <span className="text-xs text-gray-400">Prüfe…</span>
              ) : telegramConfigured ? (
                <span className="flex items-center gap-1 text-xs font-medium text-sage">
                  <CheckCircle className="h-3.5 w-3.5" /> Konfiguriert
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
                  <XCircle className="h-3.5 w-3.5" /> Nicht konfiguriert
                </span>
              )}
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Der Literaturkompass kann dir über einen Telegram-Bot Benachrichtigungen schicken — bei neuen Ausschreibungen, nahenden Deadlines oder KI-Empfehlungen.
              </p>

              <div className="rounded-xl bg-lit-muted dark:bg-dark-muted px-5 py-4 text-sm space-y-2">
                <p className="font-medium text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider">So richtest du es ein</p>
                <ol className="text-gray-600 dark:text-gray-400 space-y-1.5 text-xs">
                  <li><span className="font-mono text-accent">1.</span> Schreibe auf Telegram: <span className="font-mono text-accent">@BotFather</span> → <span className="font-mono">/newbot</span></li>
                  <li><span className="font-mono text-accent">2.</span> Kopiere den <strong>Bot Token</strong></li>
                  <li><span className="font-mono text-accent">3.</span> Sende dem Bot eine Nachricht, rufe dann <span className="font-mono text-accent">@userinfobot</span> auf für deine Chat-ID</li>
                  <li><span className="font-mono text-accent">4.</span> Trage in <strong>Coolify → Environment Variables</strong> ein:</li>
                </ol>
                <div className="rounded-lg bg-dark-bg/80 dark:bg-dark-bg px-4 py-2.5 font-mono text-xs text-gray-300 space-y-1">
                  <p>TELEGRAM_BOT_TOKEN=<span className="text-gold">1234567890:ABC...</span></p>
                  <p>TELEGRAM_CHAT_ID=<span className="text-gold">123456789</span></p>
                </div>
              </div>

              {telegramConfigured && (
                <div>
                  <button
                    onClick={handleTelegramTest}
                    disabled={telegramTest === 'loading'}
                    className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/20 disabled:opacity-50 transition-all"
                  >
                    {telegramTest === 'loading'
                      ? <RotateCw className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                    Testnachricht senden
                  </button>
                  {telegramTest === 'ok' && (
                    <p className="mt-2 text-xs text-sage flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Nachricht erfolgreich gesendet!
                    </p>
                  )}
                  {telegramTest === 'error' && (
                    <p className="mt-2 text-xs text-red-500">{telegramError}</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Datenverwaltung ── */}
          <section className="rounded-2xl bg-white dark:bg-dark-surface shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Datenverwaltung</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Daten exportieren</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Alle Daten als JSON-Datei</p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-dark-border px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-muted disabled:opacity-50 transition-colors"
                >
                  {exportLoading ? <RotateCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exportieren
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">v1 Daten importieren</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">JSON-Export aus Literaturkompass v1</p>
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-dark-border px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-muted cursor-pointer transition-colors">
                  {importLoading ? <RotateCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  JSON auswählen
                  <input type="file" accept=".json" onChange={handleImportV1Data} disabled={importLoading} className="hidden" />
                </label>
              </div>
            </div>
          </section>

          {/* ── About ── */}
          <div className="px-2 py-3 text-xs text-gray-400 dark:text-gray-600 text-center">
            Literaturkompass v2.0 · KI-gestützte Wettbewerbsverwaltung
          </div>

        </div>
      </div>
    </main>
  )
}
