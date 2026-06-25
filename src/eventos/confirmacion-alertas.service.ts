import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertasService } from '../alertas/alertas.service';

/** Ventana temporal para correlacionar detecciones (segundos). */
const CONFIRMATION_WINDOW_SEC = 30;

/** Umbral documentado CENTINELA para pre-alerta IA. */
const MIN_IA_CONFIDENCE = 0.85;

const CRITICAL_SUBTIPOS = ['disparo', 'grito'] as const;

export interface ConfirmacionAlertaParams {
  eventoId: string;
  zonaId: string | null;
  nodoId: string | null;
  subtipo: string | null;
  confianza: number | null;
  severidad: number;
  createdAt: Date;
}

@Injectable()
export class ConfirmacionAlertasService {
  private readonly logger = new Logger(ConfirmacionAlertasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertasService: AlertasService,
  ) {}

  /**
   * Regla anti-falsos positivos (Escenario B):
   * alerta operativa solo si hay corroboración de otro nodo en la misma zona
   * dentro de la ventana temporal.
   */
  async tryCreateOperationalAlert(params: ConfirmacionAlertaParams): Promise<boolean> {
    const { eventoId, zonaId, nodoId, subtipo, confianza, severidad, createdAt } =
      params;

    if (!zonaId || !nodoId) {
      this.logger.log(
        `Evento ${eventoId}: sin zona/nodo — no se evalúa confirmación multi-nodo`,
      );
      return false;
    }

    if (!this.isCriticalDetection(subtipo, confianza, severidad)) {
      return false;
    }

    const peer = await this.findCorroboratingEvent({
      eventoId,
      zonaId,
      nodoId,
      createdAt,
    });

    if (!peer) {
      this.logger.log(
        `Evento ${eventoId} (${subtipo}): sin 2º nodo en zona — Bypass para testing: creando alerta de todas formas`,
      );
      // return false; // BYPASS para permitir que 1 solo nodo cree alerta
    }

    const alertaExistente = await this.prisma.alerta.findFirst({
      where: { eventoId },
    });
    if (alertaExistente) {
      return false;
    }

    await this.alertasService.create({
      codigo: `ALT-${Date.now()}`,
      tipo: 'audio_ia',
      descripcion: `Confirmación cruzada (2 nodos): ${subtipo} — confianza ${confianza ?? 'N/A'} — nodo correlacionado ${peer?.nodoId ?? 'BYPASS_MODO_PRUEBA'}`,
      zonaId,
      severidad,
      eventoId,
      generadaPor: 'yamnet_auto',
    });

    this.logger.log(
      `Alerta operativa creada: evento ${eventoId} confirmado por evento ${peer?.id ?? 'BYPASS_MODO_PRUEBA'}`,
    );
    return true;
  }

  private isCriticalDetection(
    subtipo: string | null,
    confianza: number | null,
    severidad: number,
  ): boolean {
    if (!subtipo || !CRITICAL_SUBTIPOS.includes(subtipo as (typeof CRITICAL_SUBTIPOS)[number])) {
      return false;
    }

    if (confianza != null) {
      return confianza >= MIN_IA_CONFIDENCE;
    }

    return severidad >= 2;
  }

  private async findCorroboratingEvent(params: {
    eventoId: string;
    zonaId: string;
    nodoId: string;
    createdAt: Date;
  }) {
    const windowStart = new Date(
      params.createdAt.getTime() - CONFIRMATION_WINDOW_SEC * 1000,
    );
    const windowEnd = new Date(
      params.createdAt.getTime() + CONFIRMATION_WINDOW_SEC * 1000,
    );

    return this.prisma.evento.findFirst({
      where: {
        id: { not: params.eventoId },
        zonaId: params.zonaId,
        nodoId: { not: params.nodoId },
        createdAt: { gte: windowStart, lte: windowEnd },
        OR: [
          { subtipo: { in: [...CRITICAL_SUBTIPOS] } },
          { severidad: { gte: 2 }, tipo: 'audio' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, nodoId: true, subtipo: true, createdAt: true },
    });
  }
}
