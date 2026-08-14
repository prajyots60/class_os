-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institute_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "actor_name" VARCHAR(255),
    "metadata" JSONB,
    "idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activities_institute_id_student_id_idempotency_key_key" ON "activities"("institute_id", "student_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "activities_institute_id_student_id_occurred_at_id_idx" ON "activities"("institute_id", "student_id", "occurred_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
