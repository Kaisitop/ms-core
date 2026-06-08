import { IsString, IsOptional, IsNumber, IsUUID, Min, Max, IsObject } from 'class-validator';

export class CreateEventoDto {
  @IsString()
  tipo: string; // audio, manual, ciudadano

  @IsString()
  @IsOptional()
  subtipo?: string; // disparo, grito, etc.

  @IsUUID()
  @IsOptional()
  nodoId?: string;

  @IsNumber()
  latitud: number;

  @IsNumber()
  longitud: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confianza?: number;

  @IsNumber()
  @Min(1)
  @Max(4)
  @IsOptional()
  severidad?: number;

  @IsString()
  fuente: string; // yamnet, operador, app_ciudadana

  @IsString()
  @IsOptional()
  audioUrl?: string;

  @IsObject()
  @IsOptional()
  metadatos?: Record<string, any>;
}
