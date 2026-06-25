import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import {
  FindPosicionesActivasDto,
  UpdatePosicionPatrulleroDto,
} from './dto/update-posicion-patrullero.dto';

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
}
