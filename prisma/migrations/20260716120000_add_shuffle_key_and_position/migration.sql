-- Random ticket-number allocation (Option A)
-- Additive, nullable columns — no data loss.
ALTER TABLE "Competition" ADD COLUMN "shuffleKey" TEXT;
ALTER TABLE "InstantWin" ADD COLUMN "position" INTEGER;
