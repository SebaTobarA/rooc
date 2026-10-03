import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { saveCharacterSheet } from "@/lib/actions/core-census";
import { loadCensusMembers, loadMonthSummaries, type CensusMember } from "@/lib/core-census/data";
import { SHEET_REQUIREMENTS, countRequirements, requirementStatus } from "@/lib/core-census/requirements";
import { currentMonthKey, monthLabel, recordOutcome } from "@/lib/core-census/tier";
import { BackLink } from "@/components/back-link";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { OutcomeBadge, REQUIREMENT_STATUS_CLASS, TierBadge } from "@/components/core-census/census-badges";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ficha Core",
};

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Santiago",
});

const UPDATED_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

const FIELD_CLASS =
  "mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

export default async function CoreMemberSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ discordId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { discordId } = await params;
  const { guardado } = await searchParams;

  let members: CensusMember[] = [];
  let botError: string | null = null;
  try {
    members = await loadCensusMembers();
  } catch (err) {
    botError = err instanceof Error ? err.message : "Error desconocido";
  }
  if (botError) return <BotErrorNotice message={botError} />;

  const member = members.find((candidate) => candidate.discordId === discordId);
  if (!member) notFound();

  const monthKey = currentMonthKey();
  const [history, summaries] = await Promise.all([
    prisma.coreEventRecord.findMany({
      where: { discordId, event: { coreCensusAt: { not: null } } },
      include: { event: { select: { id: true, category: true, startsAt: true } } },
      orderBy: { event: { startsAt: "desc" } },
      take: 40,
    }),
    loadMonthSummaries(monthKey),
  ]);
  const summary = summaries.get(discordId) ?? null;

  const sheet = member.sheet;
  const requirementCount = countRequirements(sheet);
  const avatarUrl = discordAvatarUrl(member.discordId, member.avatarHash, 64);

  return (
    <div>
      <BackLink href="/admin/core-guild/censo" label="Censo" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background-elevated font-semibold text-muted">
              {member.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-lg font-semibold text-foreground">{member.characterName}</h1>
            <p className="text-sm text-muted">
              @{member.username}
              {member.job ? ` · ${member.job}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>
            {monthLabel(monthKey)}:{" "}
            {summary ? `${summary.attended}/${summary.events} eventos, ${summary.faults} falta(s)` : "sin eventos censados"}
          </span>
          <TierBadge tier={summary?.tier ?? null} />
        </div>
      </div>

      {guardado && (
        <p className="mt-4 rounded-[10px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Ficha guardada.
        </p>
      )}

      <section className="mt-5 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-foreground">Ficha de equipo</h2>
          <p className="text-xs text-muted">
            Cumple {requirementCount.ok} de {SHEET_REQUIREMENTS.length}
            {requirementCount.pending > 0 ? ` · ${requirementCount.pending} sin evaluar` : ""}
            {sheet
              ? ` · Actualizada ${UPDATED_FORMATTER.format(sheet.updatedAt)}${sheet.updatedByUsername ? ` por ${sheet.updatedByUsername}` : ""}`
              : ""}
          </p>
        </div>

        <form action={saveCharacterSheet.bind(null, discordId)} className="mt-4">
          <label className="block max-w-sm text-xs text-muted">
            Personaje in-game
            <input
              type="text"
              name="characterName"
              defaultValue={sheet?.characterName ?? ""}
              placeholder={member.characterName}
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
                      {status === "ok" ? "Cumple" : status === "fail" ? "No cumple" : "Sin evaluar"}
                    </span>
                  </span>
                  {requirement.kind === "number" ? (
                    <input
                      type="number"
                      name={requirement.field}
                      min={0}
                      defaultValue={sheet?.[requirement.field] ?? ""}
                      className={FIELD_CLASS}
                    />
                  ) : (
                    <select
                      name={requirement.field}
                      defaultValue={
                        sheet?.[requirement.field] == null ? "" : sheet[requirement.field] ? "yes" : "no"
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="">Sin evaluar</option>
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
            <textarea name="notes" rows={3} maxLength={1000} defaultValue={sheet?.notes ?? ""} className={FIELD_CLASS} />
          </label>

          <button type="submit" className="btn-brand mt-4 px-4 py-2 text-sm">
            Guardar ficha
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold text-foreground">Historial de eventos</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tiene eventos censados.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Evento</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 font-medium">Juego</th>
                  <th className="px-3 py-2 font-medium">Discord</th>
                  <th className="px-3 py-2 font-medium">Puntos</th>
                  <th className="px-3 py-2 font-medium">K / D / A</th>
                  <th className="px-3 py-2 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((record) => (
                  <tr key={record.id}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/core-guild/censo/evento/${record.event.id}`}
                        className="text-foreground hover:text-accent hover:underline"
                      >
                        {EVENT_CATEGORY_LABEL[record.event.category]} ·{" "}
                        {EVENT_DATE_FORMATTER.format(record.event.startsAt)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <OutcomeBadge outcome={recordOutcome(record)} />
                    </td>
                    <td className="px-3 py-2 text-muted">{record.inGame ? "Sí" : "No"}</td>
                    <td className="px-3 py-2 text-muted">{record.inDiscord ? "Sí" : "No"}</td>
                    <td className="px-3 py-2 text-muted">{record.points ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">
                      {record.inGame && (record.kills !== null || record.deaths !== null || record.assists !== null)
                        ? `${record.kills ?? 0} / ${record.deaths ?? 0} / ${record.assists ?? 0}`
                        : "—"}
                    </td>
                    <td className="whitespace-normal px-3 py-2 text-muted">{record.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
