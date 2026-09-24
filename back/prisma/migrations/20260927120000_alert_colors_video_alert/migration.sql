-- Alert text colors
ALTER TABLE "Setting" ADD COLUMN "alertNameColor" TEXT NOT NULL DEFAULT '#ffffff';
ALTER TABLE "Setting" ADD COLUMN "alertAmountColor" TEXT NOT NULL DEFAULT '#00ff88';
ALTER TABLE "Setting" ADD COLUMN "alertMessageColor" TEXT NOT NULL DEFAULT '#ffffff';

-- Video donation: donor chooses alert + clip, or clip only
ALTER TABLE "Donation" ADD COLUMN "videoAlert" BOOLEAN;
