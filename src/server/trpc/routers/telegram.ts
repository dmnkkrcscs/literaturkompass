import { publicProcedure, router } from '../init'
import { sendMessage } from '@/lib/telegram'

export const telegramRouter = router({
  /**
   * Checks if Telegram credentials are configured and the bot can reach the chat
   */
  status: publicProcedure.query(async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId || botToken === 'placeholder' || chatId === 'placeholder') {
      return { connected: false, reason: 'Credentials not configured' }
    }

    try {
      // Verify bot token by calling getMe
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
      const data = await res.json() as { ok: boolean; result?: { username: string } }

      if (!data.ok) {
        return { connected: false, reason: 'Invalid bot token' }
      }

      return {
        connected: true,
        botUsername: data.result?.username,
        chatId,
      }
    } catch {
      return { connected: false, reason: 'Failed to reach Telegram API' }
    }
  }),

  /**
   * Sends a test message to verify the connection works end-to-end
   */
  testMessage: publicProcedure.mutation(async () => {
    const success = await sendMessage(
      '✅ <b>Literaturkompass</b> — Telegram-Verbindung erfolgreich!\n\nDu wirst ab jetzt täglich um 9:00 Uhr ein Briefing erhalten.',
    )

    return { success }
  }),
})
