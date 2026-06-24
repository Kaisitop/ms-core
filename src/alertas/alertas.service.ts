import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertaDto } from './dto/create-alerta.dto';
import { UpdateAlertaDto } from './dto/update-alerta.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  async create(createAlertaDto: CreateAlertaDto) {
    try {
      const alerta = await this.prisma.alerta.create({
        data: {
          codigo: createAlertaDto.codigo,
          tipo: createAlertaDto.tipo,
          descripcion: createAlertaDto.descripcion,
          zonaId: createAlertaDto.zonaId,
          severidad: createAlertaDto.severidad || 1,
          eventoId: createAlertaDto.eventoId,
          reporteId: createAlertaDto.reporteId,
          generadaPor: createAlertaDto.generadaPor,
        },
      });
      this.logger.log(`Alerta operativa generada: ${alerta.codigo}`);
      
      // Emitir evento a NATS para ms-notificaciones
      this.natsClient.emit('alerta.created', alerta);

      return alerta;
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: 'No se pudo generar la alerta operativa',
      });
    }
  }

  async findAll() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.id,
        a.codigo,
        a.tipo,
        a.descripcion,
        a.severidad,
        a.estado,
        a.created_at as "createdAt",
        (FLOOR(EXTRACT(EPOCH FROM a.created_at) * 1000))::bigint as "timestamp",
        z.nombre as "zonaNombre",
        ST_Y(
          COALESCE(
            rep.ubicacion::geometry,
            ev.ubicacion::geometry,
            nod.ubicacion::geometry,
            CASE
              WHEN z.geom IS NOT NULL AND NOT ST_IsEmpty(z.geom)
                THEN ST_Centroid(z.geom)
              ELSE NULL
            END
          )
        ) as latitud,
        ST_X(
          COALESCE(
            rep.ubicacion::geometry,
            ev.ubicacion::geometry,
            nod.ubicacion::geometry,
            CASE
              WHEN z.geom IS NOT NULL AND NOT ST_IsEmpty(z.geom)
                THEN ST_Centroid(z.geom)
              ELSE NULL
            END
          )
        ) as longitud
      FROM app.alertas a
      LEFT JOIN app.zonas z ON z.id = a.zona_id
      LEFT JOIN app.reportes rep ON rep.id = a.reporte_id AND rep.deleted_at IS NULL
      LEFT JOIN app.eventos ev ON ev.id = a.evento_id
      LEFT JOIN app.nodos nod ON nod.id = ev.nodo_id
      WHERE a.deleted_at IS NULL
      ORDER BY a.created_at DESC
      LIMIT 100
    `;

    return rows.map((row) => this.mapAlertaListRow(row));
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.id,
        a.codigo,
        a.tipo,
        a.descripcion,
        a.zona_id as "zonaId",
        a.severidad,
        a.estado,
        a.evento_id as "eventoId",
        a.reporte_id as "reporteId",
        a.generada_por as "generadaPor",
        a.reconocida_por as "reconocidaPor",
        a.reconocida_en as "reconocidaEn",
        a.cerrada_por as "cerradaPor",
        a.cerrada_en as "cerradaEn",
        a.notas,
        a.created_at as "createdAt",
        a.updated_at as "updatedAt",
        (FLOOR(EXTRACT(EPOCH FROM a.created_at) * 1000))::bigint as "timestamp",
        z.nombre as "zonaNombre",
        z.riesgo_nivel as "zonaRiesgoNivel",
        ST_Y(
          COALESCE(
            rep.ubicacion::geometry,
            ev.ubicacion::geometry,
            nod.ubicacion::geometry,
            CASE
              WHEN z.geom IS NOT NULL AND NOT ST_IsEmpty(z.geom)
                THEN ST_Centroid(z.geom)
              ELSE NULL
            END
          )
        ) as latitud,
        ST_X(
          COALESCE(
            rep.ubicacion::geometry,
            ev.ubicacion::geometry,
            nod.ubicacion::geometry,
            CASE
              WHEN z.geom IS NOT NULL AND NOT ST_IsEmpty(z.geom)
                THEN ST_Centroid(z.geom)
              ELSE NULL
            END
          )
        ) as longitud
      FROM app.alertas a
      LEFT JOIN app.zonas z ON z.id = a.zona_id
      LEFT JOIN app.reportes rep ON rep.id = a.reporte_id AND rep.deleted_at IS NULL
      LEFT JOIN app.eventos ev ON ev.id = a.evento_id
      LEFT JOIN app.nodos nod ON nod.id = ev.nodo_id
      WHERE a.deleted_at IS NULL
        AND a.id = CAST(${id} AS uuid)
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new RpcException({
        status: 404,
        message: 'Alerta no encontrada',
      });
    }

    return this.mapAlertaDetailRow(rows[0]);
  }

  private mapAlertaListRow(row: any) {
    return {
      id: row.id,
      codigo: row.codigo,
      tipo: row.tipo,
      descripcion: row.descripcion,
      zonaNombre: row.zonaNombre ?? null,
      severidad: Number(row.severidad),
      estado: row.estado,
      createdAt: row.createdAt,
      timestamp: Number(row.timestamp),
      latitud: row.latitud != null ? Number(row.latitud) : null,
      longitud: row.longitud != null ? Number(row.longitud) : null,
    };
  }

  private mapAlertaDetailRow(row: any) {
    return {
      id: row.id,
      codigo: row.codigo,
      tipo: row.tipo,
      descripcion: row.descripcion,
      zonaId: row.zonaId,
      zonaNombre: row.zonaNombre ?? null,
      severidad: Number(row.severidad),
      estado: row.estado,
      eventoId: row.eventoId,
      reporteId: row.reporteId,
      generadaPor: row.generadaPor,
      reconocidaPor: row.reconocidaPor,
      reconocidaEn: row.reconocidaEn,
      cerradaPor: row.cerradaPor,
      cerradaEn: row.cerradaEn,
      notas: row.notas,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      timestamp: Number(row.timestamp),
      zona: row.zonaNombre
        ? { nombre: row.zonaNombre, riesgoNivel: Number(row.zonaRiesgoNivel) }
        : null,
      latitud: row.latitud != null ? Number(row.latitud) : null,
      longitud: row.longitud != null ? Number(row.longitud) : null,
    };
  }

  async updateStatus(updateDto: UpdateAlertaDto) {
    try {
      const isReconocimiento = updateDto.estado === 'reconocida';
      const isCierre = ['cerrada', 'falsa_alarma'].includes(updateDto.estado);

      const data: any = {
        estado: updateDto.estado,
        notas: updateDto.notas,
      };

      if (isReconocimiento) {
        data.reconocidaPor = updateDto.operadorId;
        data.reconocidaEn = new Date();
      }

      if (isCierre) {
        data.cerradaPor = updateDto.operadorId;
        data.cerradaEn = new Date();
      }

      return await this.prisma.alerta.update({
        where: { id: updateDto.id },
        data,
      });
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: 'No se pudo actualizar la alerta',
      });
    }
  }
}
