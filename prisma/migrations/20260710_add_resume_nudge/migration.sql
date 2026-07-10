-- AlterTable: BotSettings
-- Merkt sich, wann zuletzt nach dem Fortsetzen gefragt wurde (nach 10 Tagen Pause),
-- damit die Nachfrage nicht täglich wiederholt wird.
ALTER TABLE "BotSettings" ADD COLUMN "resumeNudgeAt" TIMESTAMP(3);
