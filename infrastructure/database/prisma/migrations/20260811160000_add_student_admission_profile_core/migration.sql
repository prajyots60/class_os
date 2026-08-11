-- CreateEnum
CREATE TYPE "StudentAdmissionStatus" AS ENUM ('pending', 'admitted', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "StudentGender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- AlterEnum
ALTER TYPE "StudentStatus" ADD VALUE 'inactive';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "address" TEXT,
ADD COLUMN     "admission_date" DATE,
ADD COLUMN     "admission_status" "StudentAdmissionStatus" NOT NULL DEFAULT 'admitted',
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "gender" "StudentGender",
ADD COLUMN     "middle_name" VARCHAR(100),
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "postal_code" VARCHAR(20),
ADD COLUMN     "state" VARCHAR(100),
ALTER COLUMN "admission_number" SET NOT NULL;

-- CreateIndex
CREATE INDEX "students_institute_id_admission_status_idx" ON "students"("institute_id", "admission_status");

-- CreateIndex
CREATE UNIQUE INDEX "students_institute_id_admission_number_key" ON "students"("institute_id", "admission_number");
