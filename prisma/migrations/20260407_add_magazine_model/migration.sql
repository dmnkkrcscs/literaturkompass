-- CreateTable
CREATE TABLE "Magazine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Magazine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Magazine_url_key" ON "Magazine"("url");

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "magazineId" TEXT;

-- CreateIndex
CREATE INDEX "Competition_magazineId_idx" ON "Competition"("magazineId");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_magazineId_fkey" FOREIGN KEY ("magazineId") REFERENCES "Magazine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
