import { PartialType } from '@nestjs/mapped-types';
import { CreateZonaDto } from './create-zona.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateZonaDto extends PartialType(CreateZonaDto) {
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
