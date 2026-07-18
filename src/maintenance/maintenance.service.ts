import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async purgeAppData(requestedBy?: string) {
    try {
      const counts = await this.prisma.$transaction(async (tx) => {
        const notificaciones = await tx.notificacion.deleteMany({});
        const alertas = await tx.alerta.deleteMany({});
        const reportes = await tx.reporte.deleteMany({});
        const eventos = await tx.evento.deleteMany({});
        const posiciones = await tx.posicionPatrullero.deleteMany({});
        const usuarioZonas = await tx.usuarioZona.deleteMany({});
        const rutas = await tx.rutaPatrullaje.deleteMany({});

        return {
          notificaciones: notificaciones.count,
          alertas: alertas.count,
          reportes: reportes.count,
          eventos: eventos.count,
          posicionesPatrullero: posiciones.count,
          usuarioZonas: usuarioZonas.count,
          rutasPatrullaje: rutas.count,
        };
      });

      this.logger.warn(
        `Purge app data ejecutado${requestedBy ? ` por ${requestedBy}` : ''}: ${JSON.stringify(counts)}`,
      );

      return {
        message: 'Datos operativos eliminados. Zonas y nodos IoT se conservaron.',
        deleted: counts,
      };
    } catch (error) {
      this.logger.error('Error al purgar datos operativos', error);
      throw new RpcException({
        status: 500,
        message: 'No se pudo limpiar los datos operativos',
      });
    }
  }
}
