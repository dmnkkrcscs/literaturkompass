import fetch from 'node-fetch'

interface TelegramMessageOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disableWebPagePreview?: boolean
  disableNotification?: boolean
}

/**
 * Sends a message via Telegram Bot API
 */
export async function sendMessage(
  text: string,
  options: TelegramMessageOptions = {}
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn(
      'Telegram credentials not configured. Message not sent:',
      text
    )
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: options.parseMode || 'HTML',
        disable_web_page_preview: options.disableWebPagePreview ?? true,
        disable_notification: options.disableNotification ?? false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Telegram API error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
    return false
  }
}

/**
 * Sends a notification about a newly found competition
 */
export async function sendCompetitionAlert(competition: {
  name: string
  organizer?: string | null
  deadline?: Date | null
  url: string
  type: string
  genres?: string[]
}): Promise<boolean> {
  const deadlineStr = competition.deadline
    ? `<b>Deadline:</b> ${formatDate(competition.deadline)}`
    : ''

  const genresStr = competition.genres && competition.genres.length > 0
    ? `\n<b>Genres:</b> ${competition.genres.join(', ')}`
    : ''

  const message = `
<b>🎯 New Competition Found!</b>

<b>Title:</b> ${escapeHtml(competition.name)}
${competition.organizer ? `<b>Organizer:</b> ${escapeHtml(competition.organizer)}\n` : ''}${deadlineStr}
<b>Type:</b> ${competition.type}${genresStr}

<a href="${competition.url}">View Competition</a>
  `.trim()

  return sendMessage(message)
}

/**
 * Sends a deadline reminder for an upcoming competition
 */
export async function sendDeadlineReminder(
  competition: {
    name: string
    url: string
    deadline: Date
  },
  daysLeft: number
): Promise<boolean> {
  const urgencyEmoji =
    daysLeft <= 3 ? '🚨' : daysLeft <= 7 ? '⚠️' : '📅'

  const message = `
${urgencyEmoji} <b>Deadline Reminder</b>

<b>Competition:</b> ${escapeHtml(competition.name)}
<b>Days Left:</b> ${daysLeft}
<b>Deadline:</b> ${formatDate(competition.deadline)}

<a href="${competition.url}">Submit Now</a>
  `.trim()

  return sendMessage(message, {
    disableNotification: daysLeft > 7, // Don't notify for distant deadlines
  })
}

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Helper function to format dates in a user-friendly way
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
