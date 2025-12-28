-- AlterTable
ALTER TABLE "catches" ADD COLUMN     "weight" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "species" ADD COLUMN     "requires_weight" BOOLEAN NOT NULL DEFAULT false;
