-- CreateTable: BotSettings (singleton)
-- Pause-Schalter für den Telegram-Bot + Long-Poll-Cursor.
-- `paused` wird von Digest-/Reminder-Jobs vor dem Senden geprüft.
-- `pausedAt` steuert die Nachhol-Zusammenfassung beim "Start".
-- `telegramOffset` ist die letzte verarbeitete update_id + 1.
CREATE TABLE "BotSettings" (
    "id" TEXT NOT NULL,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "telegramOffset" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotSettings_pkey" PRIMARY KEY ("id")
);
