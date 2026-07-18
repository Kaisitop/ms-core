import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import {
  FindNearestPatrulleroDto,
  FindPosicionesActivasDto,
  UpdatePosicionPatrulleroDto,
} from './dto/update-posicion-patrullero.dto';
import { haversineMeters } from '../common/geo.utils';

const DEFAULT_MAX_AGE_SEC = 180;

@Injectable()
export class PatrullajeService {
  private readonly logger = new Logger(PatrullajeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  async updatePosicion(dto: UpdatePosicionPatrulleroDto) {
    try {
      const row = await this.prisma.posicionPatrullero.upsert({
        where: { usuarioId: dto.usuarioId },
        create: {
          usuarioId: dto.usuarioId,
          nombre: dto.nombre ?? null,
          latitud: dto.latitud,
          longitud: dto.longitud,
          precisionM: dto.precisionM ?? null,
        },
        update: {
          nombre: dto.nombre ?? undefined,
          latitud: dto.latitud,
          longitud: dto.longitud,
          precisionM: dto.precisionM ?? null,
        },
      });

      const payload = {
        usuarioId: row.usuarioId,
        nombre: row.nombre,
        latitud: row.latitud,
        longitud: row.longitud,
        precisionM: row.precisionM,
        updatedAt: row.updatedAt.toISOString(),
      };

      this.natsClient.emit('patrullero.position', payload);
      this.logger.debug(`Posición patrullero ${row.usuarioId} actualizada`);

      return payload;
    } catch (error) {
      this.logger.error('Error al guardar posición de patrullero', error);
      throw new RpcException({
        status: 500,
        message: 'No se pudo registrar la posición del patrullero',
      });
    }
  }

  async findPosicionesActivas(payload?: FindPosicionesActivasDto) {
    const maxAgeSec = payload?.maxAgeSec ?? DEFAULT_MAX_AGE_SEC;
    const cutoff = new Date(Date.now() - maxAgeSec * 1000);

    const rows = await this.prisma.posicionPatrullero.findMany({
      where: { updatedAt: { gte: cutoff } },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => ({
      usuarioId: row.usuarioId,
      nombre: row.nombre,
      latitud: row.latitud,
      longitud: row.longitud,
      precisionM: row.precisionM,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async findNearestPatrullero(dto: FindNearestPatrulleroDto) {
    const positions = await this.findPosicionesActivas({
      maxAgeSec: dto.maxAgeSec,
    });

    if (positions.length === 0) {
      return null;
    }

    let nearest: (typeof positions)[number] | null = null;
    let minDistance = Infinity;

    for (const pos of positions) {
      const dist = haversineMeters(
        dto.latitud,
        dto.longitud,
        pos.latitud,
        pos.longitud,
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = pos;
      }
    }

    if (!nearest) {
      return null;
    }

    const distanciaM = Math.round(minDistance);
    this.logger.log(
      `Patrullero más cercano: ${nearest.usuarioId} (${nearest.nombre ?? 'sin nombre'}) a ${distanciaM} m`,
    );

    return {
      usuarioId: nearest.usuarioId,
      nombre: nearest.nombre,
      latitud: nearest.latitud,
      longitud: nearest.longitud,
      precisionM: nearest.precisionM,
      updatedAt: nearest.updatedAt,
      distanciaM,
    };
  }
}
