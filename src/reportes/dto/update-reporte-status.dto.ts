import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateReporteStatusDto {
  @IsUUID()
  id: string;

  @IsString()
  estado: string; // en_proceso, resuelto, falso

  @IsUUID()
  @IsOptional()
  operadorId?: string;

  @IsString()
  @IsOptional()
  notasOperador?: string;
}
