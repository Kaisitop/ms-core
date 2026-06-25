import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertasService } from '../alertas/alertas.service';
import { envs } from '../config/envs';

/** Ventana temporal para correlacionar detecciones entre nodos (segundos). */
const CONFIRMATION_WINDOW_SEC = 30;

/** Umbral documentado CENTINELA para pre-alerta IA. */
const MIN_IA_CONFIDENCE = 0.85;

const CRITICAL_SUBTIPOS = ['disparo', 'grito'] as const;

const OPEN_ALERT_STATES = ['activa', 'reconocida'] as const;

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
   *
   * Dedup adicional: un mismo nodo + zona + subtipo no genera otra alerta
   * abierta dentro de ALERT_DEDUP_WINDOW_SEC (default 60 s).
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

    const alertaExistente = await this.prisma.alerta.findFirst({
      where: { eventoId },
    });
    if (alertaExistente) {
      return false;
    }

    const duplicate = await this.findRecentDuplicateAlert({
      zonaId,
      nodoId,
      subtipo: subtipo!,
    });
    if (duplicate) {
      this.logger.log(
        `Evento ${eventoId}: alerta duplicada suprimida (nodo ${nodoId}, ${subtipo}) — ref ${duplicate.codigo}`,
      );
      return false;
    }

    const peer = await this.findCorroboratingEvent({
      eventoId,
      zonaId,
      nodoId,
      createdAt,
    });

    if (!peer && !envs.alertSingleNodeBypass) {
      this.logger.log(
        `Evento ${eventoId} (${subtipo}): sin 2º nodo en zona — alerta no creada (multi-nodo requerido)`,
      );
      return false;
    }

    if (!peer && envs.alertSingleNodeBypass) {
      this.logger.log(
        `Evento ${eventoId} (${subtipo}): bypass single-node activo — creando alerta`,
      );
    }

    const peerLabel = peer?.nodoId ?? 'single_node_bypass';
    await this.alertasService.create({
      codigo: `ALT-${Date.now()}`,
      tipo: 'audio_ia',
      descripcion: peer
        ? `Confirmación cruzada (2 nodos): ${subtipo} — confianza ${confianza ?? 'N/A'} — nodo correlacionado ${peerLabel}`
        : `Detección IA (${subtipo}) — confianza ${confianza ?? 'N/A'} — nodo ${nodoId}`,
      zonaId,
      severidad,
      eventoId,
      generadaPor: 'yamnet_auto',
    });

    this.logger.log(
      `Alerta operativa creada: evento ${eventoId}${peer ? ` confirmado por ${peer.id}` : ''}`,
    );
    return true;
  }

  private async findRecentDuplicateAlert(params: {
    zonaId: string;
    nodoId: string;
    subtipo: string;
  }) {
    const windowStart = new Date(
      Date.now() - envs.alertDedupWindowSec * 1000,
    );

    return this.prisma.alerta.findFirst({
      where: {
        zonaId: params.zonaId,
        tipo: 'audio_ia',
        estado: { in: [...OPEN_ALERT_STATES] },
        createdAt: { gte: windowStart },
        evento: {
          nodoId: params.nodoId,
          subtipo: params.subtipo,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codigo: true, createdAt: true },
    });
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
