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
}
