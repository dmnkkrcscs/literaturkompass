-- DropIndex
DROP INDEX "Competition_deadline_idx";

-- DropIndex
DROP INDEX "Competition_dismissed_idx";

-- DropIndex
DROP INDEX "Competition_status_idx";

-- CreateIndex
CREATE INDEX "Competition_status_dismissed_idx" ON "Competition"("status", "dismissed");

-- CreateIndex
CREATE INDEX "Competition_status_dismissed_deadline_idx" ON "Competition"("status", "dismissed", "deadline");

-- CreateIndex
CREATE INDEX "Competition_sourceId_idx" ON "Competition"("sourceId");

-- CreateIndex
CREATE INDEX "CrawlLog_url_idx" ON "CrawlLog"("url");

-- CreateIndex
CREATE INDEX "CrawlLog_status_createdAt_idx" ON "CrawlLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_competitionId_status_idx" ON "Submission"("competitionId", "status");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");
