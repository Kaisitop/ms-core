import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZonaDto, UpdateZonaDto } from './dto';

@Injectable()
export class ZonasService {
  private readonly logger = new Logger(ZonasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createZonaDto: CreateZonaDto) {
    const {
      nombre,
      descripcion = null,
      riesgoNivel = 1,
      geomWkt = 'POLYGON EMPTY',
    } = createZonaDto;

    try {
      const result = await this.prisma.$queryRaw<any[]>`
        INSERT INTO app.zonas (
          id, nombre, descripcion, geom, riesgo_nivel, activa, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${nombre},
          ${descripcion},
          ST_GeomFromText(${geomWkt}, 4326),
          ${riesgoNivel},
          true,
          NOW(),
          NOW()
        )
        RETURNING id, nombre, descripcion, riesgo_nivel as "riesgoNivel", activa, created_at as "createdAt", updated_at as "updatedAt"
      `;

      return result[0];
    } catch (error) {
      this.logger.error(`Error al crear zona: ${error.message}`, error.stack);
      throw new RpcException({ statusCode: 500, message: 'Error interno al crear la zona' });
    }
  }

  async findAll() {
    return this.prisma.zona.findMany({
      where: { activa: true },
      include: {
        _count: { select: { nodos: true, eventos: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const zona = await this.prisma.zona.findUnique({
      where: { id },
      include: {
        nodos: {
          where: { activo: true },
          select: { id: true, codigo: true, estado: true, ultimoHeartbeat: true },
        },
        _count: { select: { eventos: true, reportes: true, alertas: true } },
      },
    });

    if (!zona) {
      throw new RpcException({ statusCode: 404, message: `Zona con id ${id} no encontrada` });
    }

    return zona;
  }

  async update(id: string, updateZonaDto: UpdateZonaDto) {
    await this.findOne(id);

    const { geomWkt, nombre, descripcion, riesgoNivel, activa } = updateZonaDto;

    try {
      if (geomWkt !== undefined) {
        const result = await this.prisma.$queryRaw<any[]>`
          UPDATE app.zonas
          SET
            nombre = COALESCE(${nombre ?? null}, nombre),
            descripcion = COALESCE(${descripcion ?? null}, descripcion),
            riesgo_nivel = COALESCE(${riesgoNivel ?? null}, riesgo_nivel),
            activa = COALESCE(${activa ?? null}, activa),
            geom = ST_GeomFromText(${geomWkt}, 4326),
            updated_at = NOW()
          WHERE id = CAST(${id} AS uuid)
          RETURNING id, nombre, descripcion, riesgo_nivel as "riesgoNivel", activa, created_at as "createdAt", updated_at as "updatedAt"
        `;

        return result[0];
      }

      const data: {
        nombre?: string;
        descripcion?: string;
        riesgoNivel?: number;
        activa?: boolean;
      } = {};

      if (nombre !== undefined) data.nombre = nombre;
      if (descripcion !== undefined) data.descripcion = descripcion;
      if (riesgoNivel !== undefined) data.riesgoNivel = riesgoNivel;
      if (activa !== undefined) data.activa = activa;

      if (Object.keys(data).length === 0) {
        return this.findOne(id);
      }

      return this.prisma.zona.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(`Error al actualizar zona: ${error.message}`, error.stack);
      throw new RpcException({ statusCode: 500, message: 'Error interno al actualizar la zona' });
    }
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica existencia

    // Soft delete: desactiva en lugar de eliminar
    return this.prisma.zona.update({
      where: { id },
      data: { activa: false },
    });
  }

  async setZonaPrincipal(usuarioId: string, zonaId: string) {
    await this.findOne(zonaId);

    const [principalExistente, zonaObjetivo] = await Promise.all([
      this.prisma.usuarioZona.findFirst({
        where: { usuarioId, tipo: 'principal' },
      }),
      this.prisma.usuarioZona.findUnique({
        where: { usuarioId_zonaId: { usuarioId, zonaId } },
      }),
    ]);

    if (principalExistente?.zonaId === zonaId) {
      return principalExistente;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const suscripcionesCount = await tx.usuarioZona.count({
          where: { usuarioId, tipo: 'suscrita' },
        });

        const objetivoYaEsSuscrita = zonaObjetivo?.tipo === 'suscrita';
        const principalAnteriorDistinto =
          principalExistente != null && principalExistente.zonaId !== zonaId;

        if (principalAnteriorDistinto && !objetivoYaEsSuscrita) {
          if (suscripcionesCount >= 3) {
            throw new RpcException({
              statusCode: 400,
              message:
                'Límite de 3 zonas suscritas alcanzado. Desuscribe una zona antes de cambiar la principal.',
            });
          }
        }

        if (principalAnteriorDistinto) {
          await tx.usuarioZona.update({
            where: {
              usuarioId_zonaId: {
                usuarioId,
                zonaId: principalExistente.zonaId,
              },
            },
            data: { tipo: 'suscrita' },
          });
        }

        if (zonaObjetivo) {
          return tx.usuarioZona.update({
            where: { usuarioId_zonaId: { usuarioId, zonaId } },
            data: { tipo: 'principal' },
          });
        }

        return tx.usuarioZona.create({
          data: { usuarioId, zonaId, tipo: 'principal' },
        });
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if (error.code === 'P2002') {
        throw new RpcException({
          statusCode: 400,
          message: 'El usuario ya está asociado a esta zona',
        });
      }
      this.logger.error(
        `Error al establecer zona principal: ${error.message}`,
        error.stack,
      );
      throw new RpcException({
        statusCode: 500,
        message: 'Error interno al establecer la zona principal',
      });
    }
  }

  async subscribeZona(usuarioId: string, zonaId: string) {
    await this.findOne(zonaId); // Verifica existencia

    const suscripciones = await this.prisma.usuarioZona.count({
      where: { usuarioId, tipo: 'suscrita' },
    });

    if (suscripciones >= 3) {
      throw new RpcException({ statusCode: 400, message: 'Límite de 3 zonas suscritas alcanzado' });
    }

    try {
      return await this.prisma.usuarioZona.create({
        data: { usuarioId, zonaId, tipo: 'suscrita' },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new RpcException({ statusCode: 400, message: 'El usuario ya está asociado a esta zona' });
      }
      throw new RpcException({ statusCode: 500, message: 'Error interno al suscribir la zona' });
    }
  }

  async unsubscribeZona(usuarioId: string, zonaId: string) {
    try {
      return await this.prisma.usuarioZona.delete({
        where: {
          usuarioId_zonaId: { usuarioId, zonaId },
        },
      });
    } catch (error) {
      throw new RpcException({ statusCode: 404, message: 'La asociación con la zona no existe' });
    }
  }

  async getUserZonas(usuarioId: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        uz.usuario_id as "usuarioId",
        uz.zona_id as "zonaId",
        uz.tipo,
        uz.created_at as "createdAt",
        z.id as "zona_id",
        z.nombre as "zona_nombre",
        z.riesgo_nivel as "zona_riesgoNivel",
        ST_AsText(z.geom) as "zona_geomWkt"
      FROM app.usuario_zonas uz
      INNER JOIN app.zonas z ON z.id = uz.zona_id
      WHERE uz.usuario_id = CAST(${usuarioId} AS uuid)
      ORDER BY uz.tipo ASC
    `;

    return rows.map((row) => ({
      usuarioId: row.usuarioId,
      zonaId: row.zonaId,
      tipo: row.tipo,
      createdAt: row.createdAt,
      zona: {
        id: row.zona_id,
        nombre: row.zona_nombre,
        riesgoNivel: Number(row.zona_riesgoNivel),
        geomWkt: row.zona_geomWkt,
      },
    }));
  }
}
