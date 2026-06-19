/*
  Warnings:

  - A unique constraint covering the columns `[accessToken]` on the table `Donation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "slipImage" TEXT,
ADD COLUMN     "transRef" TEXT;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "alertSound" TEXT NOT NULL DEFAULT 'donation.mp3',
ADD COLUMN     "alertVolume" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "overlayDuration" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "promptpayNumber" TEXT,
ADD COLUMN     "ttsVoice" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Donation_accessToken_key" ON "Donation"("accessToken");
