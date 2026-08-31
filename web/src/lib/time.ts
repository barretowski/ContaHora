/** 150 -> "2:30" */
export function minutesToHhMm(total: number): string {
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

/** 150 -> "2h30" (compacto) */
export function minutesToLabel(total: number): string {
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

/**
 * Aceita "2:30", "2h30", "2h", "150" (minutos), "2,5" / "2.5" (horas decimais).
 * Retorna minutos ou null se inválido.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s/g, '');
  if (!s) return null;

  let m = s.match(/^(\d{1,2}):([0-5]?\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  m = s.match(/^(\d{1,2})h([0-5]?\d)?$/);
  if (m) return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);

  m = s.match(/^(\d+)[.,](\d+)$/);
  if (m) return Math.round(Number(`${m[1]}.${m[2]}`) * 60);

  m = s.match(/^(\d+)$/);
  if (m) return Number(m[1]);

  return null;
}
