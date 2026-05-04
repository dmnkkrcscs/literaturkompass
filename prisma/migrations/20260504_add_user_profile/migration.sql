-- CreateTable: UserProfile (singleton)
-- Speichert Alter und erlaubte Regionen des Users. Der Crawler nutzt
-- `allowedRegions` für Auto-Dismiss bei nicht passender regionRestriction.
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "age" INTEGER,
    "allowedRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
