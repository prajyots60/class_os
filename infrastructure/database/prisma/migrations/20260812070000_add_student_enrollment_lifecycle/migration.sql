-- AlterEnum EnrollmentStatus
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'transferred';

-- AlterTable enrollments: add new columns, drop deprecated columns
ALTER TABLE "enrollments"
  ADD COLUMN IF NOT EXISTS "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "withdrawn_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "transferred_to_batch_id" UUID,
  ADD COLUMN IF NOT EXISTS "transferred_to_enrollment_id" UUID;

-- Migrate existing joined_on to enrolled_at if present
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'joined_on'
    ) THEN
        UPDATE "enrollments" SET "enrolled_at" = "joined_on" WHERE "joined_on" IS NOT NULL;
        ALTER TABLE "enrollments" DROP COLUMN "joined_on";
    END IF;
END $$;

ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "discount_type";
ALTER TABLE "enrollments" DROP COLUMN IF EXISTS "discount_value";

-- Foreign key constraints update (Restrict student & batch deletion when active enrollment exists)
ALTER TABLE "enrollments" DROP CONSTRAINT IF EXISTS "enrollments_student_id_fkey";
ALTER TABLE "enrollments" DROP CONSTRAINT IF EXISTS "enrollments_batch_id_fkey";

ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Self-referential and transfer batch foreign keys
DO $$ BEGIN
    ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_transferred_to_batch_id_fkey" FOREIGN KEY ("transferred_to_batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_transferred_to_enrollment_id_fkey" FOREIGN KEY ("transferred_to_enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Indexes & Constraints
DROP INDEX IF EXISTS "enrollments_student_id_idx";
DROP INDEX IF EXISTS "enrollments_batch_id_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "enrollment_student_batch_unique" ON "enrollments"("institute_id", "student_id", "batch_id");
CREATE INDEX IF NOT EXISTS "enrollments_institute_id_status_idx" ON "enrollments"("institute_id", "status");
CREATE INDEX IF NOT EXISTS "enrollments_institute_id_student_id_idx" ON "enrollments"("institute_id", "student_id");
CREATE INDEX IF NOT EXISTS "enrollments_institute_id_batch_id_idx" ON "enrollments"("institute_id", "batch_id");
