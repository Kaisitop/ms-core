import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpdatePosicionPatrulleroDto {
  @IsUUID()
  usuarioId: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precisionM?: number;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export class FindPosicionesActivasDto {
  @IsOptional()
  @IsNumber()
  maxAgeSec?: number;
}
