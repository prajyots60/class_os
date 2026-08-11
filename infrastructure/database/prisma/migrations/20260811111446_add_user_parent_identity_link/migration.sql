-- AlterTable
ALTER TABLE "users" ADD COLUMN     "parent_identity_id" UUID;

-- CreateIndex
CREATE INDEX "users_parent_identity_id_idx" ON "users"("parent_identity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_parent_identity_id_fkey" FOREIGN KEY ("parent_identity_id") REFERENCES "parent_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
