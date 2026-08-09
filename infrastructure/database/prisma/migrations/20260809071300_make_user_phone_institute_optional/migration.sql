-- AlterTable: Make institute_id and phone optional on users table
ALTER TABLE "users" ALTER COLUMN "institute_id" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;
