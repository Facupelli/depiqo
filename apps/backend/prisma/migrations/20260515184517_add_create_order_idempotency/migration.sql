-- CreateEnum
CREATE TYPE "OrderCreateIdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "order_create_idempotency_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" "OrderCreateIdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "order_create_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_create_idempotency_keys_tenant_id_customer_id_idx" ON "order_create_idempotency_keys"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "order_create_idempotency_keys_order_id_idx" ON "order_create_idempotency_keys"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_create_idempotency_keys_tenant_id_customer_id_idempot_key" ON "order_create_idempotency_keys"("tenant_id", "customer_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "order_create_idempotency_keys" ADD CONSTRAINT "order_create_idempotency_keys_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
