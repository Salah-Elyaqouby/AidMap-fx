-- AidMap: verification token purpose + request aid tracking fields + Aid notes + Doctor schedule

CREATE TYPE "VerificationTokenPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

ALTER TABLE "VerificationToken" ADD COLUMN IF NOT EXISTS "purpose" "VerificationTokenPurpose" NOT NULL DEFAULT 'EMAIL_VERIFY';

ALTER TABLE "RequestAid" ADD COLUMN IF NOT EXISTS "referenceCode" TEXT;
ALTER TABLE "RequestAid" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RequestAid_referenceCode_key" ON "RequestAid"("referenceCode");

CREATE INDEX IF NOT EXISTS "RequestAid_nationalId_idx" ON "RequestAid"("nationalId");

CREATE INDEX IF NOT EXISTS "RequestAid_phone_idx" ON "RequestAid"("phone");

ALTER TABLE "Aid" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "schedule" TEXT;
