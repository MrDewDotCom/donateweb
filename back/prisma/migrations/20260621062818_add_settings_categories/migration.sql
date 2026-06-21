-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "recentLimit" SET DEFAULT 5;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "maxDonationAmount" INTEGER,
ADD COLUMN     "minDonationAmount" INTEGER,
ADD COLUMN     "monthlyGoalAmount" INTEGER,
ADD COLUMN     "monthlyGoalAutoReset" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "overlayAnimation" TEXT NOT NULL DEFAULT 'fade',
ADD COLUMN     "overlayImage" TEXT,
ADD COLUMN     "readMessageEnabled" BOOLEAN NOT NULL DEFAULT true;
