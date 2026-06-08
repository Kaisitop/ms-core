import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertaDto } from './dto/create-alerta.dto';
import { UpdateAlertaDto } from './dto/update-alerta.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createAlertaDto: CreateAlertaDto) {
    try {
      const alerta = await this.prisma.alerta.create({
        data: {
          codigo: createAlertaDto.codigo,
          tipo: createAlertaDto.tipo,
          descripcion: createAlertaDto.descripcion,
          zonaId: createAlertaDto.zonaId,
          severidad: createAlertaDto.severidad || 1,
          eventoId: createAlertaDto.eventoId,
          reporteId: createAlertaDto.reporteId,
          generadaPor: createAlertaDto.generadaPor,
        },
      });
      this.logger.log(`Alerta operativa generada: ${alerta.codigo}`);
      return alerta;
    } catch (error) {
      throw new RpcException({
        status: 500,
        message: 'No se pudo generar la alerta operativa',
      });
    }
  }

  async findAll() {
    return this.prisma.alerta.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        zona: {
          select: { nombre: true, riesgoNivel: true }
        }
      }
    });
  }

  async updateStatus(updateDto: UpdateAlertaDto) {
    try {
      const isReconocimiento = updateDto.estado === 'reconocida';
      const isCierre = ['cerrada', 'falsa_alarma'].includes(updateDto.estado);

      const data: any = {
        estado: updateDto.estado,
        notas: updateDto.notas,
      };

      if (isReconocimiento) {
        data.reconocidaPor = updateDto.operadorId;
        data.reconocidaEn = new Date();
      }

      if (isCierre) {
        data.cerradaPor = updateDto.operadorId;
        data.cerradaEn = new Date();
      }

      return await this.prisma.alerta.update({
        where: { id: updateDto.id },
        data,
      });
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: 'No se pudo actualizar la alerta',
      });
    }
  }
}
