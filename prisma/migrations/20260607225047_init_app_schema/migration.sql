-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateTable
CREATE TABLE "app"."zonas" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "riesgo_nivel" SMALLINT NOT NULL DEFAULT 1,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."nodos" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "zona_id" UUID NOT NULL,
    "version_fw" VARCHAR(50),
    "cert_fingerprint" CHAR(64),
    "ultimo_heartbeat" TIMESTAMPTZ(6),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activo',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "nodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."eventos" (
    "id" UUID NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "subtipo" VARCHAR(50),
    "nodo_id" UUID,
    "zona_id" UUID,
    "confianza" DECIMAL(5,4),
    "severidad" SMALLINT NOT NULL DEFAULT 1,
    "fuente" VARCHAR(30) NOT NULL,
    "audio_url" TEXT,
    "metadatos" JSONB,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."reportes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "tipo" VARCHAR(30) NOT NULL,
    "descripcion" TEXT,
    "zona_id" UUID,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "prioridad" SMALLINT NOT NULL DEFAULT 1,
    "fotos_urls" TEXT,
    "evento_id" UUID,
    "operador_id" UUID,
    "notas_operador" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cerrado_en" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."alertas" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "descripcion" TEXT,
    "zona_id" UUID,
    "severidad" SMALLINT NOT NULL DEFAULT 1,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activa',
    "evento_id" UUID,
    "reporte_id" UUID,
    "generada_por" VARCHAR(30) NOT NULL,
    "reconocida_por" UUID,
    "reconocida_en" TIMESTAMPTZ(6),
    "cerrada_por" UUID,
    "cerrada_en" TIMESTAMPTZ(6),
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."notificaciones" (
    "id" UUID NOT NULL,
    "alerta_id" UUID NOT NULL,
    "canal" VARCHAR(20) NOT NULL,
    "destinatario_id" UUID NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "intentos" SMALLINT NOT NULL DEFAULT 0,
    "proveedor_msg_id" TEXT,
    "error_detalle" TEXT,
    "enviada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."rutas_patrullaje" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "zona_id" UUID NOT NULL,
    "prioridad" SMALLINT NOT NULL DEFAULT 1,
    "turno" VARCHAR(20) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "generada_por_ia" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rutas_patrullaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zonas_activa_idx" ON "app"."zonas"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "nodos_codigo_key" ON "app"."nodos"("codigo");

-- CreateIndex
CREATE INDEX "nodos_zona_id_idx" ON "app"."nodos"("zona_id");

-- CreateIndex
CREATE INDEX "nodos_estado_idx" ON "app"."nodos"("estado");

-- CreateIndex
CREATE INDEX "eventos_tipo_idx" ON "app"."eventos"("tipo");

-- CreateIndex
CREATE INDEX "eventos_zona_id_idx" ON "app"."eventos"("zona_id");

-- CreateIndex
CREATE INDEX "eventos_nodo_id_idx" ON "app"."eventos"("nodo_id");

-- CreateIndex
CREATE INDEX "eventos_procesado_idx" ON "app"."eventos"("procesado");

-- CreateIndex
CREATE INDEX "eventos_created_at_idx" ON "app"."eventos"("created_at");

-- CreateIndex
CREATE INDEX "reportes_estado_idx" ON "app"."reportes"("estado");

-- CreateIndex
CREATE INDEX "reportes_zona_id_idx" ON "app"."reportes"("zona_id");

-- CreateIndex
CREATE INDEX "reportes_usuario_id_idx" ON "app"."reportes"("usuario_id");

-- CreateIndex
CREATE INDEX "reportes_deleted_at_idx" ON "app"."reportes"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_codigo_key" ON "app"."alertas"("codigo");

-- CreateIndex
CREATE INDEX "alertas_estado_idx" ON "app"."alertas"("estado");

-- CreateIndex
CREATE INDEX "alertas_zona_id_idx" ON "app"."alertas"("zona_id");

-- CreateIndex
CREATE INDEX "alertas_created_at_idx" ON "app"."alertas"("created_at");

-- CreateIndex
CREATE INDEX "notificaciones_alerta_id_idx" ON "app"."notificaciones"("alerta_id");

-- CreateIndex
CREATE INDEX "notificaciones_estado_idx" ON "app"."notificaciones"("estado");

-- CreateIndex
CREATE INDEX "rutas_patrullaje_zona_id_idx" ON "app"."rutas_patrullaje"("zona_id");

-- CreateIndex
CREATE INDEX "rutas_patrullaje_activa_idx" ON "app"."rutas_patrullaje"("activa");

-- AddForeignKey
ALTER TABLE "app"."nodos" ADD CONSTRAINT "nodos_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "app"."zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."eventos" ADD CONSTRAINT "eventos_nodo_id_fkey" FOREIGN KEY ("nodo_id") REFERENCES "app"."nodos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."eventos" ADD CONSTRAINT "eventos_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "app"."zonas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."reportes" ADD CONSTRAINT "reportes_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "app"."zonas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."reportes" ADD CONSTRAINT "reportes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "app"."eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."alertas" ADD CONSTRAINT "alertas_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "app"."zonas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."alertas" ADD CONSTRAINT "alertas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "app"."eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."alertas" ADD CONSTRAINT "alertas_reporte_id_fkey" FOREIGN KEY ("reporte_id") REFERENCES "app"."reportes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."notificaciones" ADD CONSTRAINT "notificaciones_alerta_id_fkey" FOREIGN KEY ("alerta_id") REFERENCES "app"."alertas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."rutas_patrullaje" ADD CONSTRAINT "rutas_patrullaje_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "app"."zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
