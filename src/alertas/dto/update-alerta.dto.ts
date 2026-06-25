import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateAlertaDto {
  @IsUUID()
  id: string;

  @IsString()
  estado: string; // reconocida, cerrada, falsa_alarma

  @IsUUID()
  operadorId: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsString()
  @IsOptional()
  comentarioCierre?: string;

  /** JSON array serializado de URLs de evidencia */
  @IsString()
  @IsOptional()
  evidenciaUrls?: string;
}
