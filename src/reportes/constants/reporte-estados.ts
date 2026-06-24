/**
 * Estados del ciclo de vida de un reporte ciudadano (app.reportes.estado).
 */
export const REPORTE_ESTADOS = [
  'PENDIENTE',
  'EN_PROCESO',
  'RESUELTO',
  'FALSO',
] as const;

/** Estados que un operador puede asignar vía PUT /reportes/:id/estado */
export const REPORTE_ESTADOS_OPERADOR = [
  'EN_PROCESO',
  'RESUELTO',
  'FALSO',
] as const;

export type ReporteEstado = (typeof REPORTE_ESTADOS)[number];

export const REPORTE_ESTADO_LABELS: Record<ReporteEstado, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
  FALSO: 'Falso positivo',
};

export function normalizeReporteEstado(estado: string): string {
  return estado?.trim().toUpperCase() ?? '';
}

export function isReporteEstadoValid(estado: string): estado is ReporteEstado {
  return (REPORTE_ESTADOS as readonly string[]).includes(estado);
}

export function isReporteEstadoOperadorValid(estado: string): boolean {
  return (REPORTE_ESTADOS_OPERADOR as readonly string[]).includes(estado);
}

export function reporteEstadoCierraCaso(estado: string): boolean {
  const normalizado = normalizeReporteEstado(estado);
  return normalizado === 'RESUELTO' || normalizado === 'FALSO';
}
