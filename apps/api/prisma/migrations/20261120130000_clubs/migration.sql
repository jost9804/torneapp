
-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('OWNER', 'ADMIN', 'COACH', 'SPOKESPERSON', 'CAPTAIN');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "clubId" TEXT,
ADD COLUMN     "finalPosition" INTEGER;

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "crestUrl" TEXT,
    "nameChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMember" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClubRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubPlayer" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER,
    "position" TEXT,

    CONSTRAINT "ClubPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryRequest" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Club_name_idx" ON "Club"("name");

-- CreateIndex
CREATE INDEX "ClubMember_userId_idx" ON "ClubMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMember_clubId_userId_role_key" ON "ClubMember"("clubId", "userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "EntryRequest_clubId_tournamentId_key" ON "EntryRequest"("clubId", "tournamentId");

-- CreateIndex
CREATE INDEX "Team_clubId_idx" ON "Team"("clubId");

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubPlayer" ADD CONSTRAINT "ClubPlayer_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryRequest" ADD CONSTRAINT "EntryRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryRequest" ADD CONSTRAINT "EntryRequest_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryRequest" ADD CONSTRAINT "EntryRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: every existing team becomes a club of its own (same id, name and crest),
-- created when its tournament was, which also starts its 6-month name lock
INSERT INTO "Club" ("id", "name", "crestUrl", "nameChangedAt", "createdAt")
SELECT t."id", t."name", t."crestUrl", tr."createdAt", tr."createdAt"
FROM "Team" t
JOIN "Tournament" tr ON tr."id" = t."tournamentId";

UPDATE "Team" SET "clubId" = "id";

-- Its tournament's first admin created it, so they own the club
INSERT INTO "ClubMember" ("id", "clubId", "userId", "role")
SELECT gen_random_uuid()::text, t."id", m."userId", 'OWNER'
FROM "Team" t
JOIN LATERAL (
  SELECT "userId" FROM "Membership"
  WHERE "tournamentId" = t."tournamentId" AND "role" = 'ADMIN' AND "status" = 'ACTIVE'
  ORDER BY "createdAt" ASC
  LIMIT 1
) m ON TRUE;

-- Their usual squad is the roster they already have
INSERT INTO "ClubPlayer" ("id", "clubId", "name", "number", "position")
SELECT gen_random_uuid()::text, "teamId", "name", "number", "position" FROM "Player";
