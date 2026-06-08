import { PartialType } from '@nestjs/mapped-types';
import { CreateNodoDto } from './create-nodo.dto';
import { IsBoolean, IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateNodoDto extends PartialType(CreateNodoDto) {
  @IsString()
  @IsOptional()
  @IsIn(['activo', 'inactivo', 'mantenimiento'])
  estado?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
