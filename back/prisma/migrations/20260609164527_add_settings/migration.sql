-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "recentLimit" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "topDonatorsLimit" INTEGER NOT NULL DEFAULT 3,
    "refreshInterval" INTEGER NOT NULL DEFAULT 5000,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ttsEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
