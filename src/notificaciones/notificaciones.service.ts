import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { buildNotificationPayload } from './notification-payload.util';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private readonly defaultWindowHours = 24;

  constructor(private readonly prisma: PrismaService) {}

  private normalizeWindowHours(horas?: number): number {
    const value = Number(horas);
    if (!Number.isFinite(value)) return this.defaultWindowHours;
    return Math.min(Math.max(Math.trunc(value), 1), 168);
  }

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

  async findByDestinatario(payload: {
    destinatarioId: string;
    limit?: number;
    offset?: number;
    horas?: number;
  }) {
    const limit = Math.min(Math.max(payload.limit ?? 50, 1), 100);
    const offset = Math.max(payload.offset ?? 0, 0);
    const windowHours = this.normalizeWindowHours(payload.horas);
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const rows = await this.prisma.notificacion.findMany({
      where: {
        destinatarioId: payload.destinatarioId,
        canal: 'fcm',
        estado: 'enviada',
        createdAt: { gte: cutoff },
      },
      include: {
        alerta: {
          include: {
            zona: { select: { nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return rows.map((row) =>
      buildNotificationPayload({
        id: row.id,
        alertaId: row.alertaId,
        createdAt: row.createdAt,
        leida: row.leida,
        alerta: {
          tipo: row.alerta.tipo,
          descripcion: row.alerta.descripcion,
          zona: row.alerta.zona,
        },
      }),
    );
  }

  async markAsRead(payload: {
    destinatarioId: string;
    notificacionId: string;
  }) {
    const row = await this.prisma.notificacion.findFirst({
      where: {
        id: payload.notificacionId,
        destinatarioId: payload.destinatarioId,
        canal: 'fcm',
        estado: 'enviada',
      },
      include: {
        alerta: {
          include: {
            zona: { select: { nombre: true } },
          },
        },
      },
    });

    if (!row) {
      throw new RpcException({
        statusCode: 404,
        message: 'Notificación no encontrada',
      });
    }

    const updated = row.leida
      ? row
      : await this.prisma.notificacion.update({
          where: { id: row.id },
          data: { leida: true },
          include: {
            alerta: {
              include: {
                zona: { select: { nombre: true } },
              },
            },
          },
        });

    return buildNotificationPayload({
      id: updated.id,
      alertaId: updated.alertaId,
      createdAt: updated.createdAt,
      leida: updated.leida,
      alerta: {
        tipo: updated.alerta.tipo,
        descripcion: updated.alerta.descripcion,
        zona: updated.alerta.zona,
      },
    });
  }
}
