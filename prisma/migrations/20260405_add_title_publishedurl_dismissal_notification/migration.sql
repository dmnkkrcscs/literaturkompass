-- AlterTable: Add title and publishedUrl to Submission
ALTER TABLE "Submission" ADD COLUMN "title" TEXT;
ALTER TABLE "Submission" ADD COLUMN "publishedUrl" TEXT;

-- AlterTable: Add competitionId relation to CrawlLog
ALTER TABLE "CrawlLog" ADD CONSTRAINT "CrawlLog_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: DismissalPattern
CREATE TABLE "DismissalPattern" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DismissalPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DismissalPattern_pattern_key" ON "DismissalPattern"("pattern");

-- CreateTable: NotificationLog
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_type_sentAt_idx" ON "NotificationLog"("type", "sentAt");
