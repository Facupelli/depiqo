-- Remove PREPARED from V2RentalStatus.
-- PostgreSQL does not support ALTER TYPE ... DROP VALUE, so the enum type is
-- recreated without the value and v2_rentals.status is converted in place.
--
-- Safety guard: no production code path ever wrote PREPARED, so no rows are
-- expected to contain it. Fail loudly instead of silently remapping if any do.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "v2_rentals" WHERE "status" = 'PREPARED') THEN
    RAISE EXCEPTION 'Cannot remove PREPARED from "V2RentalStatus": v2_rentals rows with status PREPARED exist';
  END IF;
END $$;

-- Begin transaction (Prisma convention for enum recreation)
BEGIN;

CREATE TYPE "V2RentalStatus_new" AS ENUM ('PENDING', 'DRAFT', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

ALTER TABLE "v2_rentals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "v2_rentals" ALTER COLUMN "status" TYPE "V2RentalStatus_new" USING ("status"::text::"V2RentalStatus_new");
ALTER TABLE "v2_rentals" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "V2RentalStatus";
ALTER TYPE "V2RentalStatus_new" RENAME TO "V2RentalStatus";

COMMIT;
