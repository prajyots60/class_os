-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institute_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "recipient_type" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'informational',
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_institute_id_recipient_user_id_is_read_idx" ON "notifications"("institute_id", "recipient_user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_institute_id_recipient_user_id_created_at_idx" ON "notifications"("institute_id", "recipient_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
