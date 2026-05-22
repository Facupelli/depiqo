-- CreateEnum
CREATE TYPE "RentalItemKind" AS ENUM ('PRIMARY', 'ACCESSORY');

-- AlterTable
ALTER TABLE "product_types" ADD COLUMN     "kind" "RentalItemKind" NOT NULL DEFAULT 'PRIMARY';
