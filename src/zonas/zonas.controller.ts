import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ZonasService } from './zonas.service';
import { CreateZonaDto, UpdateZonaDto } from './dto';

@Controller()
export class ZonasController {
  constructor(private readonly zonasService: ZonasService) {}

  @MessagePattern('zonas.create')
  create(@Payload() createZonaDto: CreateZonaDto) {
    return this.zonasService.create(createZonaDto);
  }

  @MessagePattern('zonas.findAll')
  findAll() {
    return this.zonasService.findAll();
  }

  @MessagePattern('zonas.findOne')
  findOne(@Payload() id: string) {
    return this.zonasService.findOne(id);
  }

  @MessagePattern('zonas.update')
  update(@Payload() payload: { id: string; data: UpdateZonaDto }) {
    return this.zonasService.update(payload.id, payload.data);
  }

  @MessagePattern('zonas.remove')
  remove(@Payload() id: string) {
    return this.zonasService.remove(id);
  }
}
