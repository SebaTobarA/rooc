/**
 * Convierte una fecha/hora "de reloj" en Santiago de Chile a su instante
 * UTC real — usado para armar la semana de asistencia combinada
 * (createAttendanceWeek), ya que los horarios de los eventos y el cierre
 * de inscripciones (18:00) siempre se definen en hora de Chile,
 * independiente de la zona horaria de quien los crea o del runtime del
 * servidor (Vercel corre en UTC).
 */
const CHILE_TIME_ZONE = "America/Santiago";

export function chileWallTimeToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date(guess))
    .reduce(
      (acc, p) => {
        acc[p.type] = p.value;
        return acc;
      },
      {} as Record<string, string>
    );

  const renderedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );

  return new Date(guess + (guess - renderedAsUtc));
}

/** Suma días a una fecha "YYYY-MM-DD" y devuelve los componentes resultantes (sin horas). */
export function addDaysToDateString(dateStr: string, days: number): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}
