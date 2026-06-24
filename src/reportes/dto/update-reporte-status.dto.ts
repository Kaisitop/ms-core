import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';
import { REPORTE_ESTADOS_OPERADOR } from '../constants/reporte-estados';

export class UpdateReporteStatusDto {
  @IsUUID()
  id: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsIn([...REPORTE_ESTADOS_OPERADOR], {
    message: `estado debe ser uno de: ${REPORTE_ESTADOS_OPERADOR.join(', ')}`,
  })
  estado: string;

  @IsUUID()
  @IsOptional()
  operadorId?: string;

  @IsString()
  @IsOptional()
  notasOperador?: string;
}
