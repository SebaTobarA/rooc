/**
 * Los inputs date/time nativos necesitan "YYYY-MM-DD" y "HH:mm" por
 * separado (a diferencia de toISOString(), que da UTC). Se formatean
 * SIEMPRE en hora de Argentina, no en la del runtime: en Vercel ese runtime
 * es UTC, así que usar getFullYear()/getHours() mostraba la hora corrida 3
 * horas respecto de lo que después vuelve a parsear eventSchema (que asume
 * -03:00) y de lo que muestra el resto de la UI.
 *
 * Vive en su propio archivo (sin "use client") porque lo llaman tanto
 * componentes de cliente (event-form.tsx) como de servidor
 * (panel/eventos/[id]/page.tsx) — si viviera en un archivo "use client", el
 * componente de servidor no podría invocarlas directamente.
 */
const AR_TIME_ZONE = "America/Argentina/Buenos_Aires";

const AR_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: AR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function argentinaParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of AR_PARTS_FORMATTER.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

export function toLocalDateValue(date: Date): string {
  const p = argentinaParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}
export function toLocalTimeValue(date: Date): string {
  const p = argentinaParts(date);
  return `${p.hour}:${p.minute}`;
}
