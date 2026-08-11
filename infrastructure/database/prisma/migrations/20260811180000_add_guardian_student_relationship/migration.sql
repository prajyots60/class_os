-- CreateEnum
CREATE TYPE "GuardianRelationshipType" AS ENUM ('father', 'mother', 'guardian', 'stepfather', 'stepmother', 'grandparent', 'sibling', 'other');

-- CreateEnum
CREATE TYPE "GuardianRelationshipStatus" AS ENUM ('active', 'archived');

-- DropTable & DropEnum
DROP TABLE IF EXISTS "institute_parent_students";
DROP TYPE IF EXISTS "Relation";

-- CreateTable
CREATE TABLE "institute_parent_students" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institute_id" UUID NOT NULL,
    "institute_parent_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "relationship_type" "GuardianRelationshipType" NOT NULL DEFAULT 'father',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "GuardianRelationshipStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "institute_parent_students_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "institute_parent_students" ADD CONSTRAINT "institute_parent_students_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "institute_parent_students" ADD CONSTRAINT "institute_parent_students_institute_parent_id_fkey" FOREIGN KEY ("institute_parent_id") REFERENCES "institute_parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "institute_parent_students" ADD CONSTRAINT "institute_parent_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique Constraints & Indexes
CREATE UNIQUE INDEX "institute_parent_student_unique" ON "institute_parent_students"("institute_id", "institute_parent_id", "student_id");
CREATE INDEX "institute_parent_students_institute_id_student_id_idx" ON "institute_parent_students"("institute_id", "student_id");
CREATE INDEX "institute_parent_students_institute_id_institute_parent_id_idx" ON "institute_parent_students"("institute_id", "institute_parent_id");
CREATE INDEX "institute_parent_students_institute_id_status_idx" ON "institute_parent_students"("institute_id", "status");

-- Partial Unique Index enforcing single active primary guardian per student invariant
CREATE UNIQUE INDEX "institute_parent_students_active_primary_unique" ON "institute_parent_students"("institute_id", "student_id") WHERE "is_primary" = true AND "status" = 'active';
