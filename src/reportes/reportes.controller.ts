import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReportesService } from './reportes.service';
import { CreateReporteDto } from './dto/create-reporte.dto';
import { UpdateReporteStatusDto } from './dto/update-reporte-status.dto';

@Controller()
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @MessagePattern('reportes.create')
  create(@Payload() createReporteDto: CreateReporteDto) {
    return this.reportesService.create(createReporteDto);
  }

  @MessagePattern('reportes.findAll')
  findAll(@Payload() payload?: { usuarioId?: string }) {
    return this.reportesService.findAll(payload?.usuarioId);
  }

  @MessagePattern('reportes.findOne')
  findOne(@Payload() payload: { id: string; usuarioId?: string }) {
    return this.reportesService.findOne(payload.id, payload.usuarioId);
  }

  @MessagePattern('reportes.updateStatus')
  updateStatus(@Payload() updateDto: UpdateReporteStatusDto) {
    return this.reportesService.updateStatus(updateDto);
  }
}
