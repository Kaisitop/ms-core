import { Controller } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@Controller()
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @MessagePattern('eventos.create')
  create(@Payload() createEventoDto: CreateEventoDto) {
    return this.eventosService.create(createEventoDto);
  }

  @MessagePattern('eventos.update')
  update(@Payload() updateEventoDto: UpdateEventoDto) {
    return this.eventosService.update(updateEventoDto);
  }

  @MessagePattern('eventos.findAll')
  findAll() {
    return this.eventosService.findAll();
  }
}
