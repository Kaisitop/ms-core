import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HeatMapPoint {
  lat: number;
  lng: number;
  intensity: number;
  subtipo: string;
  confianza: number | null;
  eventoId: string;
  createdAt: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHeatMap(dias = 30): Promise<{ points: HeatMapPoint[] }> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        ev.id as "eventoId",
        ev.subtipo,
        ev.confianza,
        ev.created_at as "createdAt",
        ST_Y(ev.ubicacion::geometry) as lat,
        ST_X(ev.ubicacion::geometry) as lng
      FROM app.eventos ev
      WHERE ev.subtipo IN ('disparo', 'grito')
        AND ev.ubicacion IS NOT NULL
        AND ev.created_at >= NOW() - (${dias}::int * INTERVAL '1 day')
      ORDER BY ev.created_at DESC
      LIMIT 500
    `;

    const points: HeatMapPoint[] = rows
      .filter((row) => row.lat != null && row.lng != null)
      .map((row) => {
        const confianza =
          row.confianza != null ? Number(row.confianza) : null;
        const intensity =
          confianza != null
            ? Math.max(0.1, Math.min(1, confianza))
            : 0.5;

        return {
          eventoId: row.eventoId,
          lat: Number(row.lat),
          lng: Number(row.lng),
          intensity,
          subtipo: row.subtipo,
          confianza,
          createdAt: row.createdAt,
        };
      });

    return { points };
  }
}
