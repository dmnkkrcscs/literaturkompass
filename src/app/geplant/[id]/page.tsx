'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { ChevronLeft, Upload, Wand2 } from 'lucide-react'

interface TextAnalysis {
  charCount: number
  wordCount: number
  normseiten: number
}

export default function CompetitionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [textAnalysis, setTextAnalysis] = useState<TextAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [notes, setNotes] = useState('')

  const competitionId = params.id as string

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)

      // Read and analyze text
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const charCount = text.length
        const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length
        const normseiten = Math.ceil(wordCount / 250) // German Normseite standard

        setTextAnalysis({
          charCount,
          wordCount,
          normseiten,
        })
      }
      reader.readAsText(file)
    }
  }

  const handleAnalyzeText = async () => {
    if (!uploadedFile) return

    setAnalyzing(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const text = e.target?.result as string

        // Call AI analysis API (placeholder for now)
        const response = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competitionId,
            text,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('AI Analysis:', result)
          // Handle analysis results
        }
      }
      reader.readAsText(uploadedFile)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmit = async () => {
    try {
      // Call submission API
      const response = await fetch('/api/submission/mark-submitted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId,
          status: 'SUBMITTED',
        }),
      })

      if (response.ok) {
        router.push('/geplant')
      }
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/geplant"
          className="mb-6 inline-flex items-center text-accent-light dark:text-accent-dark hover:opacity-80"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Zurück</span>
        </Link>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Text Upload Zone */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Text Upload
            </h2>

            <div className="mt-4">
              <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 cursor-pointer transition-colors hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Datei hochladen oder hierher ziehen
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  TXT, DOC, DOCX
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".txt,.doc,.docx"
                />
              </label>
            </div>

            {uploadedFile && (
              <div className="mt-4">
                <p className="text-sm font-medium text-black dark:text-white">
                  Datei: {uploadedFile.name}
                </p>

                {textAnalysis && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-light-bg p-4 dark:bg-dark-bg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Zeichen
                      </p>
                      <p className="mt-1 text-2xl font-bold text-accent-light dark:text-accent-dark">
                        {textAnalysis.charCount.toLocaleString('de-DE')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-light-bg p-4 dark:bg-dark-bg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Wörter
                      </p>
                      <p className="mt-1 text-2xl font-bold text-accent-light dark:text-accent-dark">
                        {textAnalysis.wordCount.toLocaleString('de-DE')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-light-bg p-4 dark:bg-dark-bg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Normseiten
                      </p>
                      <p className="mt-1 text-2xl font-bold text-accent-light dark:text-accent-dark">
                        {textAnalysis.normseiten}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={handleAnalyzeText}
                    loading={analyzing}
                    variant="primary"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    KI-Analyse
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Notizen
            </h2>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notizen zur Einreichung..."
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white p-3 text-black placeholder-gray-500 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-400"
              rows={6}
            />
          </section>

          {/* Actions */}
          <section className="flex gap-3">
            <Button
              onClick={handleSubmit}
              variant="primary"
              disabled={!uploadedFile}
            >
              Als eingereicht markieren
            </Button>
            <Link href="/geplant" className="w-full">
              <Button variant="secondary" className="w-full">
                Abbrechen
              </Button>
            </Link>
          </section>
        </div>
      </div>
    </main>
  )
}
