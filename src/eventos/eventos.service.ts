import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfirmacionAlertasService } from './confirmacion-alertas.service';

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly confirmacionAlertas: ConfirmacionAlertasService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
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
        RETURNING id, tipo, subtipo, zona_id as "zonaId", nodo_id as "nodoId", severidad, confianza, created_at as "createdAt"
      `;

      const eventoCreado = result[0];
      this.logger.log(`Evento creado: ${eventoCreado.id} en Zona: ${eventoCreado.zonaId}`);

      await this.confirmacionAlertas.tryCreateOperationalAlert({
        eventoId: eventoCreado.id,
        zonaId: eventoCreado.zonaId,
        nodoId: eventoCreado.nodoId,
        subtipo: subtipo ?? null,
        confianza,
        severidad,
        createdAt: new Date(eventoCreado.createdAt),
      });

      this.natsClient.emit('evento.created', eventoCreado);

      return eventoCreado;
    } catch (error) {
      this.logger.error(`Error al crear evento: ${error.message}`, error.stack);
      throw new RpcException({
        status: 500,
        message: 'Error interno al procesar el evento geoespacial',
      });
    }
  }

  async update(updateEventoDto: UpdateEventoDto) {
    const {
      id,
      subtipo,
      confianza,
      severidad,
      fuente,
      procesado = true,
      metadatos = null,
    } = updateEventoDto;

    try {
      const existing = await this.prisma.evento.findUnique({ where: { id } });
      if (!existing) {
        throw new RpcException({
          status: 404,
          message: `Evento ${id} no encontrado`,
        });
      }

      const mergedMetadatos = {
        ...((existing.metadatos as Record<string, any>) || {}),
        ...(metadatos || {}),
        ia_procesado_en: new Date().toISOString(),
      };

      const eventoActualizado = await this.prisma.evento.update({
        where: { id },
        data: {
          ...(subtipo !== undefined ? { subtipo } : {}),
          ...(confianza !== undefined ? { confianza } : {}),
          ...(severidad !== undefined ? { severidad } : {}),
          ...(fuente !== undefined ? { fuente } : {}),
          procesado,
          metadatos: mergedMetadatos,
        },
      });

      this.logger.log(
        `Evento actualizado por IA: ${id} subtipo=${subtipo} confianza=${confianza}`,
      );

      const subtipoFinal = subtipo ?? existing.subtipo;
      const severidadFinal = severidad ?? existing.severidad;
      const confianzaFinal =
        confianza !== undefined
          ? confianza
          : existing.confianza != null
            ? Number(existing.confianza)
            : null;

      await this.confirmacionAlertas.tryCreateOperationalAlert({
        eventoId: id,
        zonaId: eventoActualizado.zonaId,
        nodoId: eventoActualizado.nodoId,
        subtipo: subtipoFinal,
        confianza: confianzaFinal,
        severidad: severidadFinal,
        createdAt: eventoActualizado.createdAt,
      });

      this.natsClient.emit('evento.updated', {
        id: eventoActualizado.id,
        subtipo: eventoActualizado.subtipo,
        confianza: eventoActualizado.confianza,
        severidad: eventoActualizado.severidad,
        procesado: eventoActualizado.procesado,
      });

      return eventoActualizado;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(`Error al actualizar evento: ${error.message}`, error.stack);
      throw new RpcException({
        status: 500,
        message: 'Error interno al actualizar el evento',
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
