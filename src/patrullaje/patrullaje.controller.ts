import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PatrullajeService } from './patrullaje.service';
import {
  FindPosicionesActivasDto,
  UpdatePosicionPatrulleroDto,
} from './dto/update-posicion-patrullero.dto';

@Controller()
export class PatrullajeController {
  constructor(private readonly patrullajeService: PatrullajeService) {}

  @MessagePattern('patrullaje.updatePosicion')
  updatePosicion(@Payload() payload: UpdatePosicionPatrulleroDto) {
    return this.patrullajeService.updatePosicion(payload);
  }

  @MessagePattern('patrullaje.findPosicionesActivas')
  findPosicionesActivas(@Payload() payload?: FindPosicionesActivasDto) {
    return this.patrullajeService.findPosicionesActivas(payload);
  }
}
