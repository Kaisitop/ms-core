import { Injectable, Logger, Inject } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateReporteDto } from './dto/create-reporte.dto';

import { UpdateReporteStatusDto } from './dto/update-reporte-status.dto';

import { ClientProxy, RpcException } from '@nestjs/microservices';

import { AlertasService } from '../alertas/alertas.service';
import {
  getReporteTipoConfig,
  normalizeReporteTipo,
} from './constants/reporte-tipos';
import {
  normalizeReporteEstado,
  reporteEstadoCierraCaso,
} from './constants/reporte-estados';



@Injectable()

export class ReportesService {

  private readonly logger = new Logger(ReportesService.name);



  constructor(

    private readonly prisma: PrismaService,

    private readonly alertasService: AlertasService,

    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,

  ) {}



  async create(createReporteDto: CreateReporteDto) {

    const {

      usuarioId,

      tipo,

      descripcion = null,

      latitud,

      longitud,

      fotosUrls = [],

    } = createReporteDto;

    const tipoNormalizado = normalizeReporteTipo(tipo);
    const tipoConfig = getReporteTipoConfig(tipoNormalizado);
    if (!tipoConfig) {
      throw new RpcException({
        status: 400,
        message: 'Tipo de reporte no válido',
      });
    }

    try {

      const zonas = await this.prisma.$queryRaw<any[]>`

        SELECT id 

        FROM app.zonas 

        WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326))

        LIMIT 1

      `;



      const zonaId = zonas.length > 0 ? zonas[0].id : null;



      const result = await this.prisma.$queryRaw<any[]>`

        INSERT INTO app.reportes (

          id, usuario_id, tipo, descripcion, zona_id, estado, prioridad, fotos_urls, ubicacion, created_at, updated_at

        ) VALUES (

          gen_random_uuid(),

          CAST(${usuarioId} AS uuid),

          ${tipoNormalizado},

          ${descripcion},

          CAST(${zonaId} AS uuid),

          'PENDIENTE',

          ${tipoConfig.prioridad},

          CAST(${JSON.stringify(fotosUrls)} AS text),

          ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326),

          NOW(),

          NOW()

        )

        RETURNING id

      `;



      const reporteId = result[0].id as string;

      this.logger.log(`Reporte ciudadano creado: ${reporteId} en Zona: ${zonaId}`);



      if (tipoConfig.generaAlerta) {
        await this.alertasService.create({
          codigo: `ALT-REP-${Date.now()}`,
          tipo: tipoNormalizado,
          descripcion:
            descripcion?.trim() ||
            `Alerta ${tipoConfig.etiqueta} reportada por un ciudadano.`,
          zonaId,
          severidad: tipoConfig.severidadAlerta,
          reporteId,
          generadaPor: 'sistema',
        });
      }



      const reporte = await this.findOne(reporteId);

      this.natsClient.emit('reporte.created', reporte);

      return reporte;

    } catch (error) {

      this.logger.error(`Error al crear reporte: ${error.message}`, error.stack);

      throw new RpcException({

        status: 500,

        message: 'Error interno al procesar el reporte ciudadano',

      });

    }

  }



  async findAll(usuarioId?: string) {
    const rows = usuarioId
      ? await this.prisma.$queryRaw<any[]>`
          SELECT
            r.id,
            r.tipo,
            r.descripcion,
            z.nombre as "zonaNombre",
            r.estado,
            r.prioridad,
            r.fotos_urls as "fotosUrls",
            r.evento_id as "eventoId",
            r.created_at as "createdAt",
            (FLOOR(EXTRACT(EPOCH FROM r.created_at) * 1000))::bigint as "timestamp"
          FROM app.reportes r
          LEFT JOIN app.zonas z ON z.id = r.zona_id
          WHERE r.deleted_at IS NULL
            AND r.usuario_id = CAST(${usuarioId} AS uuid)
          ORDER BY r.created_at DESC
          LIMIT 100
        `
      : await this.prisma.$queryRaw<any[]>`
          SELECT
            r.id,
            r.tipo,
            r.descripcion,
            z.nombre as "zonaNombre",
            r.estado,
            r.prioridad,
            r.fotos_urls as "fotosUrls",
            r.evento_id as "eventoId",
            r.created_at as "createdAt",
            (FLOOR(EXTRACT(EPOCH FROM r.created_at) * 1000))::bigint as "timestamp"
          FROM app.reportes r
          LEFT JOIN app.zonas z ON z.id = r.zona_id
          WHERE r.deleted_at IS NULL
          ORDER BY r.created_at DESC
          LIMIT 100
        `;

    return rows.map((row) => this.mapReporteListRow(row));
  }



  async findOne(id: string, usuarioId?: string) {

    const rows = await this.prisma.$queryRaw<any[]>`

      SELECT

        r.id,

        r.usuario_id as "usuarioId",

        r.tipo,

        r.descripcion,

        r.zona_id as "zonaId",

        z.nombre as "zonaNombre",

        r.estado,

        r.prioridad,

        r.fotos_urls as "fotosUrls",

        r.evento_id as "eventoId",

        r.operador_id as "operadorId",

        r.notas_operador as "notasOperador",

        r.cerrado_en as "cerradoEn",

        r.created_at as "createdAt",

        (FLOOR(EXTRACT(EPOCH FROM r.created_at) * 1000))::bigint as "timestamp",

        r.updated_at as "updatedAt",

        ST_Y(r.ubicacion::geometry) as latitud,

        ST_X(r.ubicacion::geometry) as longitud

      FROM app.reportes r

      LEFT JOIN app.zonas z ON z.id = r.zona_id

      WHERE r.deleted_at IS NULL

        AND r.id = CAST(${id} AS uuid)

      LIMIT 1

    `;



    if (rows.length === 0) {

      throw new RpcException({

        status: 404,

        message: 'Reporte no encontrado',

      });

    }



    const row = rows[0];

    if (usuarioId && String(row.usuarioId) !== usuarioId) {
      throw new RpcException({
        status: 403,
        message: 'No tienes permiso para ver este reporte',
      });
    }

    return this.mapReporteDetailRow(row);
  }

  private mapReporteListRow(row: any) {
    return {
      id: row.id,
      tipo: row.tipo,
      descripcion: row.descripcion,
      zonaNombre: row.zonaNombre ?? null,
      estado: row.estado,
      prioridad: Number(row.prioridad),
      fotosUrls: row.fotosUrls ?? null,
      eventoId: row.eventoId ?? null,
      createdAt: row.createdAt,
      timestamp: Number(row.timestamp),
    };
  }

  private mapReporteDetailRow(row: any) {
    return {
      id: row.id,
      tipo: row.tipo,
      descripcion: row.descripcion,
      zonaId: row.zonaId,
      zonaNombre: row.zonaNombre ?? null,
      estado: row.estado,
      prioridad: Number(row.prioridad),
      fotosUrls: row.fotosUrls,
      eventoId: row.eventoId ?? null,
      operadorId: row.operadorId ?? null,
      notasOperador: row.notasOperador ?? null,
      cerradoEn: row.cerradoEn ?? null,
      createdAt: row.createdAt,
      timestamp: Number(row.timestamp),
      updatedAt: row.updatedAt,
      latitud: row.latitud != null ? Number(row.latitud) : null,
      longitud: row.longitud != null ? Number(row.longitud) : null,
    };
  }

  async purgeByUsuarioId(usuarioId: string) {
    try {
      const reportes = await this.prisma.reporte.findMany({
        where: { usuarioId, deletedAt: null },
        select: { id: true },
      });

      const reporteIds = reportes.map((reporte) => reporte.id);

      if (reporteIds.length > 0) {
        await this.prisma.alerta.updateMany({
          where: {
            reporteId: { in: reporteIds },
            estado: 'activa',
          },
          data: {
            estado: 'cerrada',
            notas: 'Cerrada: datos del ciudadano eliminados (LOPDP)',
            cerradaEn: new Date(),
          },
        });
      }

      const purged = await this.prisma.$executeRaw`
        UPDATE app.reportes
        SET
          deleted_at = NOW(),
          usuario_id = NULL,
          descripcion = '[dato eliminado]',
          fotos_urls = '[]',
          updated_at = NOW()
        WHERE usuario_id = CAST(${usuarioId} AS uuid)
          AND deleted_at IS NULL
      `;

      this.logger.log(
        `Datos ciudadano purgados: usuario=${usuarioId}, reportes=${Number(purged)}`,
      );

      return {
        reportesPurged: Number(purged),
        alertasCerradas: reporteIds.length,
      };
    } catch (error) {
      this.logger.error(
        `Error al purgar datos del ciudadano ${usuarioId}: ${error.message}`,
        error.stack,
      );
      throw new RpcException({
        status: 500,
        message: 'Error interno al eliminar los datos del ciudadano',
      });
    }
  }

  async updateStatus(updateDto: UpdateReporteStatusDto) {
    try {
      const estado = normalizeReporteEstado(updateDto.estado);

      const data: any = {
        estado,
        operadorId: updateDto.operadorId,
        notasOperador: updateDto.notasOperador,
      };

      if (reporteEstadoCierraCaso(estado)) {
        data.cerradoEn = new Date();
      }

      const updated = await this.prisma.reporte.update({
        where: { id: updateDto.id },
        data,
      });

      this.natsClient.emit('reporte.updated', {
        id: updated.id,
        estado: updated.estado,
        prioridad: updated.prioridad,
        operadorId: updated.operadorId,
        notasOperador: updated.notasOperador,
        updatedAt: updated.updatedAt,
      });

      return updated;
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: 'No se pudo actualizar el estado del reporte',
      });
    }
  }
}


