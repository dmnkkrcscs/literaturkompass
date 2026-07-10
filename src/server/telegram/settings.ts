import { db } from '@/lib/db'

/**
 * BotSettings ist ein Singleton — das gesamte System sendet an genau einen
 * konfigurierten Telegram-Chat, also gibt es genau eine Einstellungszeile.
 */
const SINGLETON_ID = 'singleton'

/** Liefert die Einstellungen, legt sie beim ersten Zugriff an. */
export async function getBotSettings() {
  return db.botSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  })
}

/** True, solange der Bot pausiert ist. Von den Sende-Jobs vor dem Senden geprüft. */
export async function isBotPaused(): Promise<boolean> {
  const settings = await db.botSettings.findUnique({ where: { id: SINGLETON_ID } })
  return settings?.paused ?? false
}

/** Pausiert den Bot und merkt sich den Zeitpunkt für die spätere Nachhol-Zusammenfassung. */
export async function pauseBot(): Promise<void> {
  const now = new Date()
  await db.botSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, paused: true, pausedAt: now, resumeNudgeAt: null },
    update: { paused: true, pausedAt: now, resumeNudgeAt: null },
  })
}

/**
 * Setzt den Bot fort und gibt den Zeitpunkt zurück, seit dem pausiert wurde
 * (oder null, falls gar nicht pausiert war). pausedAt wird dabei zurückgesetzt.
 */
export async function resumeBot(): Promise<Date | null> {
  const current = await db.botSettings.findUnique({ where: { id: SINGLETON_ID } })
  const pausedAt = current?.pausedAt ?? null
  await db.botSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, paused: false },
    update: { paused: false, pausedAt: null, resumeNudgeAt: null },
  })
  return pausedAt
}

/** Merkt sich, dass gerade nach dem Fortsetzen gefragt wurde. */
export async function markResumeNudgeSent(): Promise<void> {
  await db.botSettings.update({
    where: { id: SINGLETON_ID },
    data: { resumeNudgeAt: new Date() },
  })
}

/** Letzter verarbeiteter Long-Poll-Cursor (update_id + 1), oder undefined beim ersten Lauf. */
export async function getTelegramOffset(): Promise<number | undefined> {
  const settings = await db.botSettings.findUnique({ where: { id: SINGLETON_ID } })
  return settings?.telegramOffset ?? undefined
}

/** Persistiert den Long-Poll-Cursor, damit ein Neustart keine alten Nachrichten erneut abarbeitet. */
export async function setTelegramOffset(offset: number): Promise<void> {
  await db.botSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, telegramOffset: offset },
    update: { telegramOffset: offset },
  })
}
