import { IsString, IsOptional, IsNumber, IsUUID, IsArray } from 'class-validator';

export class CreateReporteDto {
  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @IsString()
  tipo: string; // panico, incidente, sospechoso, otro

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
