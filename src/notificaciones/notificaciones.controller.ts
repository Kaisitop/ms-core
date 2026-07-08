import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificacionesService } from './notificaciones.service';

@Controller()
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @MessagePattern('notificaciones.create')
  createMany(@Payload() data: any[]) {
    return this.notificacionesService.createMany(data);
  }

  @MessagePattern('notificaciones.find_by_destinatario')
  findByDestinatario(
    @Payload()
    payload: {
      destinatarioId: string;
      limit?: number;
      offset?: number;
      horas?: number;
    },
  ) {
    return this.notificacionesService.findByDestinatario(payload);
  }

  @MessagePattern('notificaciones.mark_as_read')
  markAsRead(
    @Payload() payload: { destinatarioId: string; notificacionId: string },
  ) {
    return this.notificacionesService.markAsRead(payload);
  }
}
