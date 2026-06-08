-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- AlterTable
ALTER TABLE "app"."nodos"
  ADD COLUMN IF NOT EXISTS "ubicacion" geometry NOT NULL DEFAULT ST_SetSRID(ST_MakePoint(0, 0), 4326);

-- AlterTable
ALTER TABLE "app"."eventos"
  ADD COLUMN IF NOT EXISTS "ubicacion" geometry;

-- AlterTable
ALTER TABLE "app"."reportes"
  ADD COLUMN IF NOT EXISTS "ubicacion" geometry NOT NULL DEFAULT ST_SetSRID(ST_MakePoint(0, 0), 4326);

-- AlterTable
ALTER TABLE "app"."rutas_patrullaje"
  ADD COLUMN IF NOT EXISTS "geom" geometry NOT NULL DEFAULT ST_GeomFromText('POLYGON EMPTY', 4326);

-- AlterTable
ALTER TABLE "app"."zonas"
  ADD COLUMN IF NOT EXISTS "geom" geometry NOT NULL DEFAULT ST_GeomFromText('POLYGON EMPTY', 4326);
