/*
  Warnings:

  - You are about to drop the column `gross_amount` on the `v2_rental_owner_splits` table. All the data in the column will be lost.
  - You are about to drop the column `net_amount` on the `v2_rental_owner_splits` table. All the data in the column will be lost.
  - You are about to drop the column `rental_amount` on the `v2_rental_owner_splits` table. All the data in the column will be lost.
  - You are about to drop the column `rental_share` on the `v2_rental_owner_splits` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `v2_rental_owner_splits` table. All the data in the column will be lost.
  - Added the required column `basis_amount` to the `v2_rental_owner_splits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `v2_rental_owner_splits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rental_demand_line_id` to the `v2_rental_owner_splits` table without a default value. This is not possible if the table is not empty.
  - Made the column `rental_selection_id` on table `v2_rental_owner_splits` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "v2_rental_owner_splits_owner_id_status_idx";

-- AlterTable
ALTER TABLE "v2_rental_owner_splits" DROP COLUMN "gross_amount",
DROP COLUMN "net_amount",
DROP COLUMN "rental_amount",
DROP COLUMN "rental_share",
DROP COLUMN "status",
ADD COLUMN     "basis_amount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "rental_demand_line_id" TEXT NOT NULL,
ALTER COLUMN "rental_selection_id" SET NOT NULL;

-- DropEnum
DROP TYPE "V2RentalOwnerSplitStatus";

-- CreateIndex
CREATE INDEX "v2_rental_owner_splits_tenant_id_owner_id_idx" ON "v2_rental_owner_splits"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "v2_rental_owner_splits_tenant_id_rental_selection_id_idx" ON "v2_rental_owner_splits"("tenant_id", "rental_selection_id");
