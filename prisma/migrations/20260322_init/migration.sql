-- CreateEnum
CREATE TYPE "CompType" AS ENUM ('WETTBEWERB', 'ANTHOLOGIE', 'ZEITSCHRIFT');

-- CreateEnum
CREATE TYPE "CompStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('AGGREGATOR', 'SEARCH', 'MANUAL');

-- CreateEnum
CREATE TYPE "CrawlStatus" AS ENUM ('SUCCESS', 'FAILED', 'DUPLICATE', 'IRRELEVANT');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('EXTRACTION', 'RELEVANCE', 'RECOMMENDATION', 'TEXT_ANALYSIS');

-- CreateEnum
CREATE TYPE "FeedbackAction" AS ENUM ('DISMISSED', 'STARRED', 'REPORTED', 'SUBMITTED');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "adapter" TEXT,
    "lastCrawl" TIMESTAMP(3),
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCrawls" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "type" "CompType" NOT NULL,
    "name" TEXT NOT NULL,
    "organizer" TEXT,
    "deadline" TIMESTAMP(3),
    "theme" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prize" TEXT,
    "maxLength" TEXT,
    "requirements" TEXT,
    "ageRestriction" TEXT,
    "regionRestriction" TEXT,
    "fee" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "sourceId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION,
    "aiExtracted" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "rawText" TEXT,
    "status" "CompStatus" NOT NULL DEFAULT 'ACTIVE',
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "starredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "status" "SubStatus" NOT NULL DEFAULT 'PLANNED',
    "documentUrl" TEXT,
    "documentName" TEXT,
    "submittedAt" TIMESTAMP(3),
    "responseAt" TIMESTAMP(3),
    "notes" TEXT,
    "charCount" INTEGER,
    "wordCount" INTEGER,
    "genreMatch" DOUBLE PRECISION,
    "styleScore" DOUBLE PRECISION,
    "requirementsMet" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalysis" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "type" "AnalysisType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "costCents" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "competitionId" TEXT,
    "url" TEXT NOT NULL,
    "status" "CrawlStatus" NOT NULL,
    "httpCode" INTEGER,
    "errorMessage" TEXT,
    "extractedData" JSONB,
    "processingMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "action" "FeedbackAction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");
CREATE UNIQUE INDEX "Competition_legacyId_key" ON "Competition"("legacyId");
CREATE UNIQUE INDEX "Competition_url_key" ON "Competition"("url");
CREATE INDEX "Competition_type_idx" ON "Competition"("type");
CREATE INDEX "Competition_deadline_idx" ON "Competition"("deadline");
CREATE INDEX "Competition_status_idx" ON "Competition"("status");
CREATE INDEX "Competition_starred_idx" ON "Competition"("starred");
CREATE INDEX "Competition_dismissed_idx" ON "Competition"("dismissed");
CREATE INDEX "Submission_status_idx" ON "Submission"("status");
CREATE INDEX "CrawlLog_sourceId_createdAt_idx" ON "CrawlLog"("sourceId", "createdAt");
CREATE INDEX "UserFeedback_competitionId_idx" ON "UserFeedback"("competitionId");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAnalysis" ADD CONSTRAINT "AiAnalysis_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrawlLog" ADD CONSTRAINT "CrawlLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
