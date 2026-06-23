import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsUUID, IsArray, IsIn } from 'class-validator';
import { REPORTE_TIPOS } from '../constants/reporte-tipos';

export class CreateReporteDto {
  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsIn([...REPORTE_TIPOS], {
    message: `tipo debe ser uno de: ${REPORTE_TIPOS.join(', ')}`,
  })
  tipo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  latitud: number;

  @IsNumber()
  longitud: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fotosUrls?: string[];
}
