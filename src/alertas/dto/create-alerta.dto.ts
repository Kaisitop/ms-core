import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateAlertaDto {
  @IsString()
  codigo: string;

  @IsString()
  tipo: string; // audio_ia, reporte_ciudadano, manual

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsUUID()
  @IsOptional()
  zonaId?: string;

  @IsNumber()
  @IsOptional()
  severidad?: number;

  @IsUUID()
  @IsOptional()
  eventoId?: string;

  @IsUUID()
  @IsOptional()
  reporteId?: string;

  @IsString()
  generadaPor: string; // yamnet_auto, operador, sistema
}
