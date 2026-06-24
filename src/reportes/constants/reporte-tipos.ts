/**
 * Catálogo de tipos de reporte — app ciudadana CENTINELA.
 * Valores persistidos en app.reportes.tipo (VARCHAR).
 */
export const REPORTE_TIPOS = [
  'PANICO',
  'HOMICIDIO_SICARIATO',
  'SECUESTRO',
  'ROBO',
  'EXTORSION',
  'PERSONA_SOSPECHOSA',
  'VEHICULO_SOSPECHOSO',
] as const;

export type ReporteTipo = (typeof REPORTE_TIPOS)[number];

export type ReporteTipoConfig = {
  prioridad: number;
  generaAlerta: boolean;
  severidadAlerta: number;
  etiqueta: string;
  /** Guía LOPDP / UX para formularios (referencia backend). */
  notaFormulario?: string;
};

export const REPORTE_TIPO_CONFIG: Record<ReporteTipo, ReporteTipoConfig> = {
  PANICO: {
    prioridad: 4,
    generaAlerta: true,
    severidadAlerta: 4,
    etiqueta: 'Pánico / SOS',
  },
  HOMICIDIO_SICARIATO: {
    prioridad: 4,
    generaAlerta: true,
    severidadAlerta: 4,
    etiqueta: 'Homicidio / Sicariato',
  },
  SECUESTRO: {
    prioridad: 4,
    generaAlerta: true,
    severidadAlerta: 4,
    etiqueta: 'Secuestro',
  },
  ROBO: {
    prioridad: 3,
    generaAlerta: true,
    severidadAlerta: 3,
    etiqueta: 'Robo',
  },
  EXTORSION: {
    prioridad: 3,
    generaAlerta: true,
    severidadAlerta: 3,
    etiqueta: 'Extorsión',
  },
  PERSONA_SOSPECHOSA: {
    prioridad: 2,
    generaAlerta: true,
    severidadAlerta: 2,
    etiqueta: 'Persona sospechosa',
    notaFormulario:
      'Reportar comportamiento únicamente; no características físicas de identidad (LOPDP 2021).',
  },
  VEHICULO_SOSPECHOSO: {
    prioridad: 2,
    generaAlerta: true,
    severidadAlerta: 2,
    etiqueta: 'Vehículo sospechoso',
    notaFormulario: 'Tipo, color y placa si está disponible.',
  },
};

export function normalizeReporteTipo(tipo: string): string {
  return tipo?.trim().toUpperCase() ?? '';
}

export function isReporteTipoValid(tipo: string): tipo is ReporteTipo {
  return (REPORTE_TIPOS as readonly string[]).includes(tipo);
}

export function getReporteTipoConfig(tipo: string): ReporteTipoConfig | null {
  const normalizado = normalizeReporteTipo(tipo);
  if (!isReporteTipoValid(normalizado)) {
    return null;
  }
  return REPORTE_TIPO_CONFIG[normalizado];
}
