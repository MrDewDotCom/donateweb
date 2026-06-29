-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "topDonatorFrom" TIMESTAMP(3),
ADD COLUMN     "topDonatorMode" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "topDonatorTo" TIMESTAMP(3);
