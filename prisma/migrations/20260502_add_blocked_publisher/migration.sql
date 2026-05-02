-- CreateTable: BlockedPublisher
-- Tracks publishers that the user has dismissed multiple times with quality
-- complaints (unseriös, schlechte Qualität, …). Once dismissalCount reaches
-- the threshold, the publisher is blocked and future crawled competitions
-- from this domain are auto-dismissed.
CREATE TABLE "BlockedPublisher" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "organizer" TEXT,
    "dismissalCount" INTEGER NOT NULL DEFAULT 1,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "lastReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedPublisher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedPublisher_domain_key" ON "BlockedPublisher"("domain");

-- CreateIndex
CREATE INDEX "BlockedPublisher_blocked_idx" ON "BlockedPublisher"("blocked");
