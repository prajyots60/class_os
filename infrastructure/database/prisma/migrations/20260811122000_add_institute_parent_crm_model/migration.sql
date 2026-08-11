-- CreateEnum
CREATE TYPE "InstituteParentStatus" AS ENUM ('active', 'inactive');

-- DropIndex
DROP INDEX IF EXISTS "institute_parents_primary_phone_institute_id_key";

-- AlterTable
ALTER TABLE "institute_parents" DROP COLUMN IF EXISTS "deleted_at",
DROP COLUMN IF EXISTS "name",
DROP COLUMN IF EXISTS "primary_phone",
DROP COLUMN IF EXISTS "secondary_phone",
ADD COLUMN "notes" TEXT,
ADD COLUMN "parent_identity_id" UUID NOT NULL,
ADD COLUMN "status" "InstituteParentStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "institute_parents_parent_identity_id_idx" ON "institute_parents"("parent_identity_id");

-- CreateIndex
CREATE INDEX "institute_parents_institute_id_status_idx" ON "institute_parents"("institute_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "institute_parents_institute_id_parent_identity_id_key" ON "institute_parents"("institute_id", "parent_identity_id");

-- AddForeignKey
ALTER TABLE "institute_parents" ADD CONSTRAINT "institute_parents_parent_identity_id_fkey" FOREIGN KEY ("parent_identity_id") REFERENCES "parent_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
