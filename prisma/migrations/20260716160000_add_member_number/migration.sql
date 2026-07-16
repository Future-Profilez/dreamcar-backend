-- Permanent sequential member number for every customer account.
-- Existing users are backfilled in join order (createdAt, id); new users get
-- the next number automatically from the sequence — atomic, race-safe.

CREATE SEQUENCE "User_memberNumber_seq";

ALTER TABLE "User" ADD COLUMN "memberNumber" INTEGER;

-- Backfill existing accounts in join order: oldest account = member #1.
UPDATE "User" u
SET "memberNumber" = s.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC NULLS LAST, id ASC) AS rn
  FROM "User"
) s
WHERE u.id = s.id;

-- Continue the sequence after the highest backfilled number.
SELECT setval('"User_memberNumber_seq"', COALESCE((SELECT MAX("memberNumber") FROM "User"), 0) + 1, false);

ALTER TABLE "User" ALTER COLUMN "memberNumber" SET DEFAULT nextval('"User_memberNumber_seq"');
ALTER TABLE "User" ALTER COLUMN "memberNumber" SET NOT NULL;
ALTER SEQUENCE "User_memberNumber_seq" OWNED BY "User"."memberNumber";

CREATE UNIQUE INDEX "User_memberNumber_key" ON "User"("memberNumber");
