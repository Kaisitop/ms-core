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
    // Usamos $queryRaw para extraer la geometría con ST_AsText
    const zonasRaw = await this.prisma.$queryRaw<any[]>`
      SELECT 
        z.id, 
        z.nombre, 
        z.descripcion, 
        ST_AsText(z.geom) as "geomWkt", 
        z.riesgo_nivel as "riesgoNivel", 
        z.activa,
        (SELECT COUNT(*) FROM app.nodos n WHERE n.zona_id = z.id AND n.activo = true)::int as "nodosCount",
        (SELECT COUNT(*) FROM app.eventos e WHERE e.zona_id = z.id)::int as "eventosCount"
      FROM app.zonas z
      WHERE z.activa = true
      ORDER BY z.nombre ASC
    `;
    
    // Mapeamos para mantener la estructura que espera el Gateway/Frontend
    return zonasRaw.map(z => ({
      ...z,
      _count: {
        nodos: z.nodosCount,
        eventos: z.eventosCount
      }
    }));
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
    await this.findOne(id); // Verifica existencia

    return this.prisma.zona.update({
      where: { id },
      data: updateZonaDto,
    });
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
    await this.findOne(zonaId); // Verifica existencia

    const principalExistente = await this.prisma.usuarioZona.findFirst({
      where: { usuarioId, tipo: 'principal' },
    });

    if (principalExistente) {
      if (principalExistente.zonaId === zonaId) return principalExistente;
      
      await this.prisma.usuarioZona.delete({
        where: {
          usuarioId_zonaId: { usuarioId, zonaId: principalExistente.zonaId },
        },
      });
    }

    return this.prisma.usuarioZona.create({
      data: { usuarioId, zonaId, tipo: 'principal' },
    });
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
    return this.prisma.usuarioZona.findMany({
      where: { usuarioId },
      include: {
        zona: { select: { id: true, nombre: true, riesgoNivel: true } },
      },
      orderBy: { tipo: 'asc' },
    });
  }

  async getUsersByZona(zonaId: string) {
    return this.prisma.usuarioZona.findMany({
      where: { zonaId },
      select: { usuarioId: true, tipo: true },
    });
  }
}
