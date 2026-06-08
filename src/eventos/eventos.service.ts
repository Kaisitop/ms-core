import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { RpcException } from '@nestjs/microservices';
import { AlertasService } from '../alertas/alertas.service';

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertasService: AlertasService,
  ) {}

  async create(createEventoDto: CreateEventoDto) {
    const {
      tipo,
      subtipo,
      nodoId,
      latitud,
      longitud,
      confianza = null,
      severidad = 1,
      fuente,
      audioUrl = null,
      metadatos = null,
    } = createEventoDto;

    try {
      // 1. Encontrar la zona donde ocurrió el evento
      const zonas = await this.prisma.$queryRaw<any[]>`
        SELECT id 
        FROM app.zonas 
        WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326))
        LIMIT 1
      `;
      
      let zonaId = zonas.length > 0 ? zonas[0].id : null;

      if (!zonaId && nodoId) {
        const nodo = await this.prisma.nodo.findUnique({
          where: { id: nodoId },
          select: { zonaId: true },
        });

        zonaId = nodo?.zonaId ?? null;
      }

      // 2. Insertar el evento con la ubicación y zona calculada
      const result = await this.prisma.$queryRaw<any[]>`
        INSERT INTO app.eventos (
          id, tipo, subtipo, nodo_id, zona_id, confianza, severidad, fuente, audio_url, metadatos, procesado, ubicacion, created_at
        ) VALUES (
          gen_random_uuid(),
          ${tipo},
          ${subtipo},
          CAST(${nodoId} AS uuid),
          CAST(${zonaId} AS uuid),
          ${confianza},
          ${severidad},
          ${fuente},
          ${audioUrl},
          CAST(${metadatos ? JSON.stringify(metadatos) : null} AS jsonb),
          false,
          ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326),
          NOW()
        )
        RETURNING id, tipo, subtipo, zona_id as "zonaId", nodo_id as "nodoId", severidad, created_at as "createdAt"
      `;
      console.log(result)
      const eventoCreado = result[0];
      console.log(eventoCreado)
      this.logger.log(`Evento creado: ${eventoCreado.id} en Zona: ${eventoCreado.zonaId}`);

      // 3. Generar Alerta Operativa si es grave (ej: disparo o grito con severidad >= 2)
      if (severidad >= 2 || subtipo === 'disparo' || subtipo === 'grito') {
        await this.alertasService.create({
          codigo: `ALT-${Date.now()}`,
          tipo: 'audio_ia',
          descripcion: `Detección de IA: ${subtipo} con confianza del ${confianza}`,
          zonaId: eventoCreado.zonaId,
          severidad: severidad,
          eventoId: eventoCreado.id,
          generadaPor: 'yamnet_auto',
        });
      }

      return eventoCreado;
    } catch (error) {
      this.logger.error(`Error al crear evento: ${error.message}`, error.stack);
      throw new RpcException({
        status: 500,
        message: 'Error interno al procesar el evento geoespacial',
      });
    }
  }

  async findAll() {
    return this.prisma.evento.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
