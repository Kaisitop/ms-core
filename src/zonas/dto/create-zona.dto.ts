import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min, Max, MaxLength } from 'class-validator';

export class CreateZonaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  riesgoNivel?: number;

  @IsString()
  @IsOptional()
  geomWkt?: string;
}
