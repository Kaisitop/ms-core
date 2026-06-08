import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength, IsNumber } from 'class-validator';

export class CreateNodoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsUUID()
  @IsNotEmpty()
  zonaId: string;

  @IsNumber()
  @IsOptional()
  latitud?: number;

  @IsNumber()
  @IsOptional()
  longitud?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  versionFw?: string;
}
