-- Video clip donation: fields on Donation
ALTER TABLE "Donation" ADD COLUMN "videoId" TEXT;
ALTER TABLE "Donation" ADD COLUMN "videoTitle" TEXT;
ALTER TABLE "Donation" ADD COLUMN "videoStart" INTEGER;
ALTER TABLE "Donation" ADD COLUMN "videoSeconds" INTEGER;
ALTER TABLE "Donation" ADD COLUMN "videoStatus" TEXT;
ALTER TABLE "Donation" ADD COLUMN "videoStartsAt" TIMESTAMP(3);

CREATE INDEX "Donation_videoStatus_paidAt_idx" ON "Donation"("videoStatus", "paidAt");

-- Video clip donation settings
ALTER TABLE "Setting" ADD COLUMN "videoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Setting" ADD COLUMN "videoRateAmount" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Setting" ADD COLUMN "videoRateSeconds" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Setting" ADD COLUMN "videoMinAmount" INTEGER;
ALTER TABLE "Setting" ADD COLUMN "videoMaxSeconds" INTEGER NOT NULL DEFAULT 180;
ALTER TABLE "Setting" ADD COLUMN "videoStartDelay" INTEGER NOT NULL DEFAULT 6;
