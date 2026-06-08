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
  findAll() {
    return this.reportesService.findAll();
  }

  @MessagePattern('reportes.updateStatus')
  updateStatus(@Payload() updateDto: UpdateReporteStatusDto) {
    return this.reportesService.updateStatus(updateDto);
  }
}
