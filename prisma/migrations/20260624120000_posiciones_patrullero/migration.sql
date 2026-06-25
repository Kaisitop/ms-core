-- Posiciones GPS de patrulleros (rol Policia)
CREATE TABLE "app"."posiciones_patrullero" (
    "usuario_id" UUID NOT NULL,
    "nombre" VARCHAR(120),
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "precision_m" DOUBLE PRECISION,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "posiciones_patrullero_pkey" PRIMARY KEY ("usuario_id")
);

CREATE INDEX "posiciones_patrullero_updated_at_idx" ON "app"."posiciones_patrullero"("updated_at");
