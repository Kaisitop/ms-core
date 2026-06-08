-- AlterTable
ALTER TABLE "app"."eventos"
  ADD COLUMN IF NOT EXISTS "ubicacion" geometry;
