-- Timer donation: donation type + seconds granted
ALTER TABLE "Donation" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "Donation" ADD COLUMN "timerSeconds" INTEGER;

-- Timer donation settings
ALTER TABLE "Setting" ADD COLUMN "timerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Setting" ADD COLUMN "timerRateAmount" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Setting" ADD COLUMN "timerRateMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Setting" ADD COLUMN "timerMinAmount" INTEGER;

-- Shared on-stream countdown (single row, id = 1)
CREATE TABLE "TimerState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "endsAt" TIMESTAMP(3),
    "remainingSec" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimerState_pkey" PRIMARY KEY ("id")
);
