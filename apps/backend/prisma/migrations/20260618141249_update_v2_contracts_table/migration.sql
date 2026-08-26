/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,rental_id]` on the table `v2_contracts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "rental_accessory_selections" DROP CONSTRAINT "rental_accessory_selections_source_rental_demand_line_id_fkey";

-- CreateTable
CREATE TABLE "_V2RentalAccessorySelectionToV2RentalDemandLine" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_V2RentalAccessorySelectionToV2RentalDemandLine_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_V2RentalAccessorySelectionToV2RentalDemandLine_B_index" ON "_V2RentalAccessorySelectionToV2RentalDemandLine"("B");

-- CreateIndex
CREATE UNIQUE INDEX "v2_contracts_tenant_id_rental_id_key" ON "v2_contracts"("tenant_id", "rental_id");

-- AddForeignKey
ALTER TABLE "_V2RentalAccessorySelectionToV2RentalDemandLine" ADD CONSTRAINT "_V2RentalAccessorySelectionToV2RentalDemandLine_A_fkey" FOREIGN KEY ("A") REFERENCES "rental_accessory_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_V2RentalAccessorySelectionToV2RentalDemandLine" ADD CONSTRAINT "_V2RentalAccessorySelectionToV2RentalDemandLine_B_fkey" FOREIGN KEY ("B") REFERENCES "v2_rental_demand_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
