import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReporteDto } from './dto/create-reporte.dto';
import { UpdateReporteStatusDto } from './dto/update-reporte-status.dto';
import { RpcException } from '@nestjs/microservices';
import { AlertasService } from '../alertas/alertas.service';

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertasService: AlertasService,
  ) {}

  async create(createReporteDto: CreateReporteDto) {
    const {
      usuarioId,
      tipo,
      descripcion = null,
      latitud,
      longitud,
      fotosUrls = [],
    } = createReporteDto;

    try {
      // 1. Encontrar la zona donde ocurrió el reporte
      const zonas = await this.prisma.$queryRaw<any[]>`
        SELECT id 
        FROM app.zonas 
        WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326))
        LIMIT 1
      `;
      
      const zonaId = zonas.length > 0 ? zonas[0].id : null;

      // 2. Insertar el reporte con la ubicación y zona calculada
      const result = await this.prisma.$queryRaw<any[]>`
        INSERT INTO app.reportes (
          id, usuario_id, tipo, descripcion, zona_id, estado, prioridad, fotos_urls, ubicacion, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          CAST(${usuarioId} AS uuid),
          ${tipo},
          ${descripcion},
          CAST(${zonaId} AS uuid),
          'pendiente',
          ${tipo === 'panico' ? 4 : 1},
          CAST(${JSON.stringify(fotosUrls)} AS text),
          ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326),
          NOW(),
          NOW()
        )
        RETURNING id, usuario_id as "usuarioId", tipo, descripcion, zona_id as "zonaId", estado, prioridad, created_at as "createdAt"
      `;

      const reporteCreado = result[0];
      this.logger.log(`Reporte ciudadano creado: ${reporteCreado.id} en Zona: ${reporteCreado.zonaId}`);

      // 3. Generar alerta si es pánico o incidente
      if (['panico', 'incidente'].includes(tipo)) {
        await this.alertasService.create({
          codigo: `ALT-REP-${Date.now()}`,
          tipo: 'reporte_ciudadano',
          descripcion: `Reporte de ciudadano: ${tipo} - ${descripcion || 'Sin descripción'}`,
          zonaId: reporteCreado.zonaId,
          severidad: tipo === 'panico' ? 4 : 2,
          reporteId: reporteCreado.id,
          generadaPor: 'sistema',
        });
      }

      return reporteCreado;
    } catch (error) {
      this.logger.error(`Error al crear reporte: ${error.message}`, error.stack);
      throw new RpcException({
        status: 500,
        message: 'Error interno al procesar el reporte ciudadano',
      });
    }
  }

  async findAll() {
    return this.prisma.reporte.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateStatus(updateDto: UpdateReporteStatusDto) {
    try {
      const data: any = {
        estado: updateDto.estado,
        operadorId: updateDto.operadorId,
        notasOperador: updateDto.notasOperador,
      };

      if (['resuelto', 'falso'].includes(updateDto.estado)) {
        data.cerradoEn = new Date();
      }

      return await this.prisma.reporte.update({
        where: { id: updateDto.id },
        data,
      });
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: 'No se pudo actualizar el estado del reporte',
      });
    }
  }
}
