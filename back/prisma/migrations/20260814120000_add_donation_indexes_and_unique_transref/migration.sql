-- CreateIndex
CREATE UNIQUE INDEX "Donation_transRef_key" ON "Donation"("transRef");

-- CreateIndex
CREATE INDEX "Donation_status_paidAt_idx" ON "Donation"("status", "paidAt");

-- CreateIndex
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");

