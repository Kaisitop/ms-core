import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AlertasService } from './alertas.service';
import { CreateAlertaDto } from './dto/create-alerta.dto';
import { UpdateAlertaDto } from './dto/update-alerta.dto';

@Controller()
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @MessagePattern('alertas.create')
  create(@Payload() createAlertaDto: CreateAlertaDto) {
    return this.alertasService.create(createAlertaDto);
  }

  @MessagePattern('alertas.findAll')
  findAll() {
    return this.alertasService.findAll();
  }

  @MessagePattern('alertas.findForMap')
  findForMap(@Payload() payload: { horas?: number }) {
    return this.alertasService.findForMap(payload?.horas);
  }

  @MessagePattern('alertas.findOne')
  findOne(@Payload() payload: { id: string }) {
    return this.alertasService.findOne(payload.id);
  }

  @MessagePattern('alertas.updateStatus')
  updateStatus(@Payload() updateDto: UpdateAlertaDto) {
    return this.alertasService.updateStatus(updateDto);
  }
}
