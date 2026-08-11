-- CreateEnum
CREATE TYPE "ParentIdentityStatus" AS ENUM ('active', 'suspended', 'deactivated');

-- AlterTable
ALTER TABLE "parent_identities" ADD COLUMN "name" VARCHAR(255),
ADD COLUMN "avatar" TEXT,
ADD COLUMN "status" "ParentIdentityStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "parent_identities_status_idx" ON "parent_identities"("status");
