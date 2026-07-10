import { sendMessage } from '@/lib/telegram'
import { generateCatchupDigest } from '@/server/ai/telegram-digest'
import {
  isBotPaused,
  pauseBot,
  resumeBot,
  getTelegramOffset,
  setTelegramOffset,
} from './settings'

/**
 * Telegram Long-Poll-Empfänger.
 *
 * Der Bot war bisher reines Ausgehen. Diese Schleife fragt via getUpdates
 * (Long Polling, kein Webhook, keine öffentliche URL nötig) nach eingehenden
 * Nachrichten und reagiert auf "Stopp" / "Start" / "Status".
 *
 * Läuft im Worker-Prozess mit; hält den Event-Loop wie die BullMQ-Worker offen.
 */

const LONG_POLL_TIMEOUT_SECONDS = 30
const ERROR_BACKOFF_MS = 5000

interface TelegramUpdate {
  update_id: number
  message?: {
    chat: { id: number }
    text?: string
  }
}

let polling = false
let abortController: AbortController | null = null

export async function startTelegramPolling(): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.warn('[TelegramPoller] TELEGRAM_BOT_TOKEN nicht gesetzt — Polling deaktiviert')
    return
  }
  if (polling) {
    console.warn('[TelegramPoller] Polling läuft bereits')
    return
  }
  polling = true
  console.log('[TelegramPoller] Long-Poll-Schleife gestartet')
  void pollLoop(botToken)
}

export function stopTelegramPolling(): void {
  polling = false
  abortController?.abort()
  console.log('[TelegramPoller] Polling gestoppt')
}

async function pollLoop(botToken: string): Promise<void> {
  while (polling) {
    try {
      const offset = await getTelegramOffset()
      const updates = await getUpdates(botToken, offset)
      for (const update of updates) {
        try {
          await handleUpdate(update)
        } catch (err) {
          console.error(`[TelegramPoller] Fehler bei update ${update.update_id}:`, err)
        }
        // Cursor auch bei Handler-Fehler weiterschieben, damit dieselbe
        // Nachricht nicht in einer Endlosschleife hängen bleibt.
        await setTelegramOffset(update.update_id + 1)
      }
    } catch (err) {
      if (!polling) break
      console.error('[TelegramPoller] Poll-Fehler:', err)
      await sleep(ERROR_BACKOFF_MS)
    }
  }
}

async function getUpdates(
  botToken: string,
  offset: number | undefined
): Promise<TelegramUpdate[]> {
  abortController = new AbortController()
  const url = `https://api.telegram.org/bot${botToken}/getUpdates`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offset,
      timeout: LONG_POLL_TIMEOUT_SECONDS,
      allowed_updates: ['message'],
    }),
    signal: abortController.signal,
  })

  if (!response.ok) {
    throw new Error(`getUpdates fehlgeschlagen: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as { ok: boolean; result?: TelegramUpdate[] }
  return data.result ?? []
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message
  if (!message?.text) return

  // Nur auf den konfigurierten Chat reagieren — sonst könnte jeder Fremde,
  // der den Bot findet, die Benachrichtigungen fernsteuern.
  const configuredChatId = process.env.TELEGRAM_CHAT_ID
  if (configuredChatId && String(message.chat.id) !== String(configuredChatId)) {
    console.warn(`[TelegramPoller] Nachricht von fremdem Chat ${message.chat.id} ignoriert`)
    return
  }

  await handleCommand(message.text.trim())
}

async function handleCommand(text: string): Promise<void> {
  // Führenden Slash (z. B. "/stop") und Groß-/Kleinschreibung wegnormalisieren.
  const cmd = text.toLowerCase().replace(/^\//, '')

  if (/^(stop|stopp|pause)$/.test(cmd)) {
    await pauseBot()
    await sendMessage(
      '⏸️ <b>Benachrichtigungen pausiert.</b>\n' +
        'Du bekommst keine Nachrichten mehr, bis du <b>Start</b> schreibst.'
    )
    return
  }

  if (/^(start|resume|weiter)$/.test(cmd)) {
    const pausedAt = await resumeBot()
    // Falls nicht pausiert war (kein pausedAt): letzte 24 h als sinnvollen Default nehmen.
    const since = pausedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000)
    const summary = await generateCatchupDigest(since)
    await sendMessage(summary)
    return
  }

  if (/^status$/.test(cmd)) {
    const paused = await isBotPaused()
    await sendMessage(
      paused
        ? '⏸️ Aktuell <b>pausiert</b>. Schreib <b>Start</b> zum Fortsetzen.'
        : '▶️ Aktuell <b>aktiv</b>. Schreib <b>Stopp</b> zum Pausieren.'
    )
    return
  }

  // Unbekannte Eingabe → kurze Hilfe.
  await sendMessage(
    'Befehle:\n' +
      '• <b>Stopp</b> — Benachrichtigungen pausieren\n' +
      '• <b>Start</b> — fortsetzen + Zusammenfassung des Versäumten\n' +
      '• <b>Status</b> — aktuellen Zustand anzeigen'
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
