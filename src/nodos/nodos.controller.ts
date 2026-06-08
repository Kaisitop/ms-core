import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NodosService } from './nodos.service';
import { CreateNodoDto, UpdateNodoDto } from './dto';

@Controller()
export class NodosController {
  constructor(private readonly nodosService: NodosService) {}

  @MessagePattern('nodos.create')
  create(@Payload() createNodoDto: CreateNodoDto) {
    return this.nodosService.create(createNodoDto);
  }

  @MessagePattern('nodos.findAll')
  findAll(@Payload() payload: { zonaId?: string }) {
    return this.nodosService.findAll(payload?.zonaId);
  }

  @MessagePattern('nodos.findOne')
  findOne(@Payload() id: string) {
    return this.nodosService.findOne(id);
  }

  @MessagePattern('nodos.update')
  update(@Payload() payload: { id: string; data: UpdateNodoDto }) {
    return this.nodosService.update(payload.id, payload.data);
  }

  @MessagePattern('nodos.heartbeat')
  heartbeat(@Payload() id: string) {
    return this.nodosService.heartbeat(id);
  }

  @MessagePattern('nodos.remove')
  remove(@Payload() id: string) {
    return this.nodosService.remove(id);
  }
}
