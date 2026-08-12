-- CreateEnum safely
DO $$ BEGIN
    CREATE TYPE "ProgramStatus" AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SubjectStatus" AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Programs
ALTER TABLE "programs"
  ADD COLUMN IF NOT EXISTS "code" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "description" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "status" "ProgramStatus" NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- Populate unique codes for existing program rows
WITH numbered_prog AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY institute_id ORDER BY created_at, id) AS rn FROM programs
)
UPDATE programs SET code = 'PROG-' || numbered_prog.rn FROM numbered_prog WHERE programs.id = numbered_prog.id;

ALTER TABLE "programs" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable Subjects: remove program_id, add code, description, status
ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_program_id_fkey";
ALTER TABLE "subjects" DROP COLUMN IF EXISTS "program_id";

ALTER TABLE "subjects"
  ADD COLUMN IF NOT EXISTS "code" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "description" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "status" "SubjectStatus" NOT NULL DEFAULT 'draft';

-- Populate unique codes for existing subject rows
WITH numbered_subj AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY institute_id ORDER BY created_at, id) AS rn FROM subjects
)
UPDATE subjects SET code = 'SUBJ-' || numbered_subj.rn FROM numbered_subj WHERE subjects.id = numbered_subj.id;

ALTER TABLE "subjects" ALTER COLUMN "code" SET NOT NULL;

-- CreateTable program_subjects
CREATE TABLE IF NOT EXISTS "program_subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institute_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_subjects_pkey" PRIMARY KEY ("id")
);

-- AlterTable Batches: add program_id, code, start_date, end_date, update teacher_id FK
ALTER TABLE "batches" DROP CONSTRAINT IF EXISTS "batches_teacher_id_fkey";

ALTER TABLE "batches"
  ADD COLUMN IF NOT EXISTS "program_id" UUID,
  ADD COLUMN IF NOT EXISTS "code" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "start_date" DATE,
  ADD COLUMN IF NOT EXISTS "end_date" DATE;

-- Populate unique codes for existing batch rows
WITH numbered_batch AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY institute_id ORDER BY created_at, id) AS rn FROM batches
)
UPDATE batches SET code = 'BATCH-' || numbered_batch.rn FROM numbered_batch WHERE batches.id = numbered_batch.id;

ALTER TABLE "batches" ALTER COLUMN "code" SET NOT NULL;

-- Nullify invalid teacher_id values that do not reference institute_memberships
UPDATE batches SET teacher_id = NULL WHERE teacher_id IS NOT NULL AND teacher_id NOT IN (SELECT id FROM institute_memberships);

-- CreateIndexes & Unique Constraints

CREATE UNIQUE INDEX IF NOT EXISTS "program_code_unique" ON "programs"("institute_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "program_name_unique" ON "programs"("institute_id", "name");
CREATE INDEX IF NOT EXISTS "programs_institute_id_status_idx" ON "programs"("institute_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "subject_code_unique" ON "subjects"("institute_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "subject_name_unique" ON "subjects"("institute_id", "name");
CREATE INDEX IF NOT EXISTS "subjects_institute_id_status_idx" ON "subjects"("institute_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "program_subject_unique" ON "program_subjects"("institute_id", "program_id", "subject_id");
CREATE INDEX IF NOT EXISTS "program_subjects_institute_id_program_id_idx" ON "program_subjects"("institute_id", "program_id");
CREATE INDEX IF NOT EXISTS "program_subjects_institute_id_subject_id_idx" ON "program_subjects"("institute_id", "subject_id");

CREATE UNIQUE INDEX IF NOT EXISTS "batch_code_unique" ON "batches"("institute_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "batch_subject_name_unique" ON "batches"("institute_id", "subject_id", "name");
CREATE INDEX IF NOT EXISTS "batches_institute_id_subject_id_idx" ON "batches"("institute_id", "subject_id");
CREATE INDEX IF NOT EXISTS "batches_institute_id_program_id_idx" ON "batches"("institute_id", "program_id");
CREATE INDEX IF NOT EXISTS "batches_institute_id_teacher_id_idx" ON "batches"("institute_id", "teacher_id");

-- Foreign Keys safely
DO $$ BEGIN
    ALTER TABLE "program_subjects" ADD CONSTRAINT "program_subjects_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "program_subjects" ADD CONSTRAINT "program_subjects_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "program_subjects" ADD CONSTRAINT "program_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "batches" ADD CONSTRAINT "batches_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "batches" ADD CONSTRAINT "batches_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "institute_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
