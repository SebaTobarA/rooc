import { AlertTriangle, CheckCircle2, MessageSquareText } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { loadMonthSummaries } from "@/lib/core-census/data";
import { SURVEY_TONE_CLASS, surveyAnswer } from "@/lib/core-census/survey";
import { EVALUATION_START, currentMonthKey, monthLabel, recordOutcome, summarizeMonth } from "@/lib/core-census/tier";
import { OutcomeBadge, TIER_HINT, TierBadge } from "@/components/core-census/census-badges";
import { PlayerPerformance } from "@/components/core-census/player-performance";
import { CoreSheetCard } from "@/components/panel/core-sheet-card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi personaje",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Santiago",
});

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Santiago",
});

/**
 * "Mi personaje": todo lo que el staff le devuelve al jugador [SD] Core sobre
 * su personaje. Primero su ficha, y después las observaciones de los
 * oficiales, cómo viene su asistencia, con qué job rinde mejor y el resultado
 * de cada evento. Es la versión para el jugador de la hoja de vida que los
 * oficiales ven en /admin/evaluacion-core.
 */
export default async function MyCharacterPage() {
  const session = await getSession();
  const sheet = session?.discordId
    ? await prisma.coreCharacterSheet.findUnique({ where: { discordId: session.discordId } })
    : null;

  if (!session?.discordId || !sheet?.inCore) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-xl font-bold text-foreground">Mi personaje</h1>
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-semibold text-foreground">Esta sección es para miembros [SD] Core</p>
          <p className="mt-1 text-sm text-muted">
            Aquí vas a ver tu ficha, tu asistencia y tu rendimiento en los eventos de la guild cuando tengas el rol.
            Si ya lo tienes y ves este mensaje, pídele a un oficial que abra Evaluación de CORE para que se cree tu
            ficha.
          </p>
        </div>
      </div>
    );
  }

  const discordId = session.discordId;
  const monthKey = currentMonthKey();
  const [history, summaries] = await Promise.all([
    prisma.coreEventRecord.findMany({
      where: { discordId, event: { coreCensusAt: { not: null }, startsAt: { gte: EVALUATION_START } } },
      include: { event: { select: { id: true, category: true, startsAt: true, attendanceMode: true } } },
      orderBy: { event: { startsAt: "desc" } },
    }),
    loadMonthSummaries(monthKey),
  ]);
  const month = summaries.get(discordId) ?? null;
  const career = summarizeMonth(history);

  // Alarma de asistencia del mes: sale del mismo conteo de faltas que el tier.
  const attendance =
    !month || month.events === 0
      ? { tone: "muted" as const, title: `Todavía no hay eventos reportados en ${monthLabel(monthKey)}`, body: "" }
      : month.faults >= 3
        ? {
            tone: "bad" as const,
            title: `Estás faltando mucho: ${month.faults} faltas en ${monthLabel(monthKey)}`,
            body: "Con 3 o más faltas en el mes quedas en tier B. Si no vas a poder asistir, avísalo antes en la encuesta de Discord para que quede justificada.",
          }
        : month.faults > 0
          ? {
              tone: "warn" as const,
              title: `Llevas ${month.faults} falta${month.faults === 1 ? "" : "s"} en ${monthLabel(monthKey)}`,
              body: "Con 1 o 2 faltas quedas en tier A; a la tercera bajas a B. Una falta es no jugar el evento o no estar en la voz de Discord.",
            }
          : {
              tone: "ok" as const,
              title: `Asistencia perfecta en ${monthLabel(monthKey)}`,
              body: "No has faltado a ningún evento reportado del mes y estuviste siempre en Discord.",
            };
  const attendanceClass = {
    ok: "border-emerald-500/40 bg-emerald-500/5",
    warn: "border-amber-500/40 bg-amber-500/5",
    bad: "border-rose-500/50 bg-rose-500/10",
    muted: "border-border bg-surface",
  }[attendance.tone];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="heading-gradient text-2xl font-extrabold sm:text-3xl">Mi personaje</h1>
      <p className="mt-1 text-sm text-muted">
        Tu ficha y todo lo que el staff ha registrado sobre tu personaje: revisiones, asistencia y rendimiento.
      </p>

      {/* ============ MI FICHA CORE ============ */}
      <CoreSheetCard discordId={discordId} />

      {/* ============ OBSERVACIONES DEL STAFF ============ */}
      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-accent" strokeWidth={2.2} />
          <h2 className="font-semibold text-foreground">Observaciones del staff</h2>
        </div>
        {sheet.notes ? (
          <>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{sheet.notes}</p>
            {sheet.reviewedAt && (
              <p className="mt-2 text-xs text-muted">
                Última revisión: {DATE_FORMATTER.format(sheet.reviewedAt)}
                {sheet.updatedByUsername ? ` por ${sheet.updatedByUsername}` : ""}.
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Sin observaciones.</p>
        )}
      </section>

      {/* ============ ASISTENCIA ============ */}
      <section className={`mt-8 rounded-xl border p-5 ${attendanceClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {attendance.tone === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" strokeWidth={2.2} />
            ) : attendance.tone === "muted" ? null : (
              <AlertTriangle
                className={`mt-0.5 h-5 w-5 shrink-0 ${attendance.tone === "bad" ? "text-rose-400" : "text-amber-400"}`}
                strokeWidth={2.2}
              />
            )}
            <div>
              <h2 className="font-semibold text-foreground">{attendance.title}</h2>
              {attendance.body && <p className="mt-1 max-w-2xl text-sm text-muted">{attendance.body}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted" title={month?.tier ? TIER_HINT[month.tier] : undefined}>
            Tier del mes
            <TierBadge tier={month?.tier ?? null} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Asistió este mes", value: month ? `${month.attended}/${month.events}` : "—" },
            { label: "En Discord este mes", value: month ? `${month.inDiscord}/${month.events}` : "—" },
            { label: "Faltas justificadas", value: month ? String(month.justified) : "—" },
            {
              label: "Asistencia histórica",
              value: career.events > 0 ? `${career.attended}/${career.events}` : "—",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[10px] border border-border bg-background-elevated p-3">
              <dt className="text-xs uppercase tracking-wide text-muted">{stat.label}</dt>
              <dd className="mt-1 font-semibold text-foreground">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ============ RENDIMIENTO ============ */}
      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">Rendimiento</h2>
        <p className="mb-4 mt-1 text-xs text-muted">
          Sale de los reportes que carga el staff después de cada evento. Cada tipo de evento va por separado: sus
          puntajes no son comparables.
        </p>
        <PlayerPerformance records={history} />
      </section>

      {/* ============ RESULTADO DE CADA EVENTO ============ */}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-foreground">Mis eventos</h2>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
            Todavía no tienes eventos reportados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Evento</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 font-medium">Discord</th>
                  <th className="px-3 py-2 font-medium">Encuesta</th>
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Party</th>
                  <th className="px-3 py-2 font-medium">Puntos</th>
                  <th className="px-3 py-2 font-medium">K / D / A</th>
                  <th className="px-3 py-2 font-medium">Nota del staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((record) => {
                  const survey = surveyAnswer(record.surveyStatus, record.event.attendanceMode);
                  return (
                    <tr key={record.id}>
                      <td className="px-3 py-2 text-foreground">
                        {EVENT_CATEGORY_LABEL[record.event.category]} · {EVENT_DATE_FORMATTER.format(record.event.startsAt)}
                      </td>
                      <td className="px-3 py-2">
                        <OutcomeBadge outcome={recordOutcome(record)} />
                      </td>
                      <td className="px-3 py-2 text-muted">{record.inDiscord ? "Sí" : "No"}</td>
                      <td className={`px-3 py-2 ${SURVEY_TONE_CLASS[survey.tone]}`}>{survey.label}</td>
                      <td className="px-3 py-2 text-muted">{record.jobName ?? "—"}</td>
                      <td className="px-3 py-2 text-muted">{record.partyName ?? "—"}</td>
                      <td className="px-3 py-2 text-muted">{record.points ?? "—"}</td>
                      <td className="px-3 py-2 text-muted">
                        {record.inGame && (record.kills !== null || record.deaths !== null || record.assists !== null)
                          ? `${record.kills ?? 0} / ${record.deaths ?? 0} / ${record.assists ?? 0}`
                          : "—"}
                      </td>
                      <td className="whitespace-normal px-3 py-2 text-muted">{record.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
