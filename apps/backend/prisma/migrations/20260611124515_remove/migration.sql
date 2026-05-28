/*
  Warnings:

  - You are about to drop the `v2_selected_accessories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "v2_selected_accessories" DROP CONSTRAINT "v2_selected_accessories_rental_demand_line_id_fkey";

-- DropForeignKey
ALTER TABLE "v2_selected_accessories" DROP CONSTRAINT "v2_selected_accessories_rental_id_fkey";

-- DropTable
DROP TABLE "v2_selected_accessories";

-- DropEnum
DROP TYPE "V2SelectedAccessoryStatus";
