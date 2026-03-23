import { NextResponse } from 'next/server'
import { sendMessage } from '@/lib/telegram'

/** GET /api/telegram — check if Telegram is configured */
export async function GET() {
  const configured = !!(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
  )
  return NextResponse.json({ configured })
}

/** POST /api/telegram — send a test message */
export async function POST() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    return NextResponse.json(
      {
        success: false,
        error:
          'TELEGRAM_BOT_TOKEN oder TELEGRAM_CHAT_ID nicht konfiguriert. Bitte in Coolify unter Umgebungsvariablen eintragen.',
      },
      { status: 400 }
    )
  }

  const ok = await sendMessage(
    '🧭 <b>Literaturkompass</b>\n\nTelegram-Verbindung erfolgreich getestet! Du erhältst ab jetzt Benachrichtigungen über neue Ausschreibungen und Deadline-Erinnerungen.'
  )

  if (!ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Nachricht konnte nicht gesendet werden. Bitte Token und Chat-ID prüfen.',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
