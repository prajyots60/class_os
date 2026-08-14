-- CreateTable
CREATE TABLE "outbound_message_queue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institute_id" UUID NOT NULL,
    "notification_id" UUID,
    "recipient_user_id" UUID NOT NULL,
    "recipient_phone" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    "template_name" VARCHAR(100) NOT NULL,
    "template_variables" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "idempotency_key" VARCHAR(255),
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_message_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbound_message_queue_institute_id_notification_id_channe_key" ON "outbound_message_queue"("institute_id", "notification_id", "channel", "recipient_user_id");

-- CreateIndex
CREATE INDEX "outbound_message_queue_status_available_at_created_at_idx" ON "outbound_message_queue"("status", "available_at", "created_at");

-- CreateIndex
CREATE INDEX "outbound_message_queue_institute_id_status_idx" ON "outbound_message_queue"("institute_id", "status");

-- AddForeignKey
ALTER TABLE "outbound_message_queue" ADD CONSTRAINT "outbound_message_queue_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_message_queue" ADD CONSTRAINT "outbound_message_queue_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_message_queue" ADD CONSTRAINT "outbound_message_queue_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
