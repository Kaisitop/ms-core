import { IsUUID, IsNotEmpty } from 'class-validator';

export class ManageUsuarioZonaDto {
  @IsUUID('4')
  @IsNotEmpty()
  usuarioId: string;

  @IsUUID('4')
  @IsNotEmpty()
  zonaId: string;
}
