import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpdateEventoDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsOptional()
  subtipo?: string;

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
  @IsOptional()
  fuente?: string;

  @IsBoolean()
  @IsOptional()
  procesado?: boolean;

  @IsObject()
  @IsOptional()
  metadatos?: Record<string, any>;
}
