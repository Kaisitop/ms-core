import { Controller } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateEventoDto } from './dto/create-evento.dto';

@Controller()
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @MessagePattern('eventos.create')
  create(@Payload() createEventoDto: CreateEventoDto) {
    return this.eventosService.create(createEventoDto);
  }

  @MessagePattern('eventos.findAll')
  findAll() {
    return this.eventosService.findAll();
  }
}
