import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: any[]) {
    try {
      const created = await this.prisma.notificacion.createMany({
        data,
      });
      this.logger.log(`Se guardaron ${created.count} notificaciones en base de datos.`);
      return { count: created.count };
    } catch (error) {
      this.logger.error(`Error guardando notificaciones: ${error.message}`);
      throw error;
    }
  }
}
