import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { saveCharacterSheet } from "@/lib/actions/core-census";
import { loadCorePlayers, loadMonthSummaries } from "@/lib/core-census/data";
import {
  SHEET_REQUIREMENTS,
  countRequirements,
  formatRequirementValue,
  requirementStatus,
} from "@/lib/core-census/requirements";
import { SURVEY_TONE_CLASS, surveyAnswer } from "@/lib/core-census/survey";
import {
  EVALUATION_START,
  currentMonthKey,
  monthLabel,
  recordOutcome,
  summarizeMonth,
} from "@/lib/core-census/tier";
import { BackLink } from "@/components/back-link";
import { OutcomeBadge, REQUIREMENT_STATUS_CLASS, TierBadge } from "@/components/core-census/census-badges";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hoja de vida",
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
  year: "numeric",
  timeZone: "America/Santiago",
});

const POINTS_FORMATTER = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

const FIELD_CLASS =
  "mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

export default async function CorePlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ discordId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { discordId } = await params;
  const { guardado } = await searchParams;

  // Sin sync: la hoja de vida de un ex miembro tiene que abrir aunque ya no
  // esté en el server (ni Discord responda).
  const { players } = await loadCorePlayers();
  const player = players.find((candidate) => candidate.discordId === discordId);
  if (!player) notFound();

  const monthKey = currentMonthKey();
  const [history, revisions, periods, summaries] = await Promise.all([
    prisma.coreEventRecord.findMany({
      where: { discordId, event: { coreCensusAt: { not: null }, startsAt: { gte: EVALUATION_START } } },
      include: { event: { select: { id: true, category: true, startsAt: true, attendanceMode: true } } },
      orderBy: { event: { startsAt: "desc" } },
    }),
    prisma.coreSheetRevision.findMany({ where: { discordId }, orderBy: { createdAt: "desc" } }),
    prisma.coreMembershipPeriod.findMany({ where: { discordId }, orderBy: { startedAt: "asc" } }),
    loadMonthSummaries(monthKey),
  ]);
  const monthSummary = summaries.get(discordId) ?? null;
  // El mismo resumen del mes, sobre toda su permanencia.
  const career = summarizeMonth(history);

  const sheet = player.sheet;
  const requirementCount = countRequirements(sheet);
  const avatarUrl = discordAvatarUrl(player.discordId, player.avatarHash, 64);

  const careerStats = [
    { label: "Eventos reportados", value: String(career.events) },
    { label: "Asistió", value: career.events > 0 ? `${career.attended}/${career.events}` : "—" },
    { label: "En Discord", value: career.events > 0 ? `${career.inDiscord}/${career.events}` : "—" },
    { label: "Faltas", value: career.events > 0 ? String(career.faults) : "—" },
    { label: "Justificadas", value: career.events > 0 ? String(career.justified) : "—" },
    { label: "Puntos promedio", value: career.avgPoints != null ? POINTS_FORMATTER.format(career.avgPoints) : "—" },
    {
      label: "K / D / A",
      value: career.kda != null ? `${career.kills}/${career.deaths}/${career.assists} (${career.kda.toFixed(1)})` : "—",
    },
  ];

  return (
    <div>
      <BackLink href="/admin/evaluacion-core" label="Evaluación de CORE" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background-elevated font-semibold text-muted">
              {player.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
              {player.characterName}
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  player.inCore ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
                }`}
              >
                {player.inCore ? "Activo en Core" : "Ex miembro"}
              </span>
            </h1>
            <p className="text-sm text-muted">
              @{player.username}
              {player.job ? ` · ${player.job}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>
            {monthLabel(monthKey)}:{" "}
            {monthSummary
              ? `${monthSummary.attended}/${monthSummary.events} eventos, ${monthSummary.faults} falta(s)`
              : "sin eventos reportados"}
          </span>
          <TierBadge tier={monthSummary?.tier ?? null} />
        </div>
      </div>

      {guardado && (
        <p className="mt-4 rounded-[10px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Revisión guardada.
        </p>
      )}

      <section className="mt-5 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">Permanencia en la guild</h2>
        {periods.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Sin periodos registrados todavía.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
            {periods.map((period, index) => (
              <li key={period.id}>
                <span className="text-foreground">{index === 0 ? "Ingreso" : "Reingreso"}:</span>{" "}
                {DATE_FORMATTER.format(period.startedAt)} →{" "}
                {period.endedAt ? DATE_FORMATTER.format(period.endedAt) : "sigue en el core"}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">
          Las fechas son las del día en que el panel detectó el cambio de rol en Discord.
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {careerStats.map((stat) => (
            <div key={stat.label} className="rounded-[10px] border border-border bg-background-elevated p-3">
              <dt className="text-xs uppercase tracking-wide text-muted">{stat.label}</dt>
              <dd className="mt-1 font-semibold text-foreground">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-5 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-foreground">Revisión de equipo</h2>
          <p className="text-xs text-muted">
            Cumple {requirementCount.ok} de {SHEET_REQUIREMENTS.length}
            {requirementCount.pending > 0 ? ` · ${requirementCount.pending} sin revisar` : ""}
            {sheet.reviewedAt
              ? ` · Última revisión ${DATE_FORMATTER.format(sheet.reviewedAt)}${sheet.updatedByUsername ? ` por ${sheet.updatedByUsername}` : ""}`
              : " · Nunca revisado"}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted">
          Se actualiza cuando los oficiales revisan al jugador, no en cada evento. Cada revisión que cambia algo queda
          en el historial de abajo.
        </p>

        <form action={saveCharacterSheet.bind(null, discordId)} className="mt-4">
          <label className="block max-w-sm text-xs text-muted">
            Personaje in-game
            <input
              type="text"
              name="characterName"
              defaultValue={sheet.characterName}
              placeholder={player.characterName}
              maxLength={60}
              className={FIELD_CLASS}
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SHEET_REQUIREMENTS.map((requirement) => {
              const status = requirementStatus(requirement, sheet);
              return (
                <label key={requirement.field} className="block text-xs text-muted">
                  <span className="flex items-baseline justify-between gap-2">
                    {requirement.label}
                    <span className={REQUIREMENT_STATUS_CLASS[status]}>
                      {status === "ok" ? "Cumple" : status === "fail" ? "No cumple" : "Sin revisar"}
                    </span>
                  </span>
                  {requirement.kind === "number" ? (
                    <input
                      type="number"
                      name={requirement.field}
                      min={0}
                      defaultValue={sheet[requirement.field] ?? ""}
                      className={FIELD_CLASS}
                    />
                  ) : (
                    <select
                      name={requirement.field}
                      defaultValue={sheet[requirement.field] == null ? "" : sheet[requirement.field] ? "yes" : "no"}
                      className={FIELD_CLASS}
                    >
                      <option value="">Sin revisar</option>
                      <option value="yes">{requirement.yes}</option>
                      <option value="no">{requirement.no}</option>
                    </select>
                  )}
                  <span className="mt-1 block">{requirement.hint}</span>
                </label>
              );
            })}
          </div>

          <label className="mt-4 block text-xs text-muted">
            Observaciones
            <textarea name="notes" rows={3} maxLength={1000} defaultValue={sheet.notes} className={FIELD_CLASS} />
          </label>

          <button type="submit" className="btn-brand mt-4 px-4 py-2 text-sm">
            Guardar revisión
          </button>
        </form>

        {revisions.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Historial de revisiones</h3>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="bg-background-elevated text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    {SHEET_REQUIREMENTS.map((requirement) => (
                      <th key={requirement.field} className="px-3 py-2 font-medium">
                        {requirement.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-medium">Revisó</th>
                    <th className="px-3 py-2 font-medium">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {revisions.map((revision) => (
                    <tr key={revision.id}>
                      <td className="px-3 py-2 text-foreground">{DATE_FORMATTER.format(revision.createdAt)}</td>
                      {SHEET_REQUIREMENTS.map((requirement) => (
                        <td
                          key={requirement.field}
                          className={`px-3 py-2 ${REQUIREMENT_STATUS_CLASS[requirementStatus(requirement, revision)]}`}
                        >
                          {formatRequirementValue(requirement, revision)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-muted">{revision.reviewedByUsername ?? "—"}</td>
                      <td className="whitespace-normal px-3 py-2 text-muted">{revision.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold text-foreground">Historial de eventos</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tiene eventos reportados.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Evento</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 font-medium">Discord</th>
                  <th className="px-3 py-2 font-medium">Encuesta</th>
                  <th className="px-3 py-2 font-medium">Jugó</th>
                  <th className="px-3 py-2 font-medium">Puntos</th>
                  <th className="px-3 py-2 font-medium">K / D / A</th>
                  <th className="px-3 py-2 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((record) => {
                  const survey = surveyAnswer(record.surveyStatus, record.event.attendanceMode);
                  return (
                    <tr key={record.id}>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/evaluacion-core/evento/${record.event.id}`}
                          className="text-foreground hover:text-accent hover:underline"
                        >
                          {EVENT_CATEGORY_LABEL[record.event.category]} ·{" "}
                          {EVENT_DATE_FORMATTER.format(record.event.startsAt)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <OutcomeBadge outcome={recordOutcome(record)} />
                      </td>
                      <td className="px-3 py-2 text-muted">{record.inDiscord ? "Sí" : "No"}</td>
                      <td className={`px-3 py-2 ${SURVEY_TONE_CLASS[survey.tone]}`}>{survey.label}</td>
                      <td className="px-3 py-2 text-muted">{record.inGame ? "Sí" : "No"}</td>
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
