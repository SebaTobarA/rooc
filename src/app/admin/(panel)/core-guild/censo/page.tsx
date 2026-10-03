import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { CORE_GUILD_ROLE_ID } from "@/lib/core-guild/sync";
import { loadCensusMembers, loadMonthEvents, loadMonthSummaries, type CensusMember } from "@/lib/core-census/data";
import { SHEET_REQUIREMENTS, formatRequirementValue, requirementStatus } from "@/lib/core-census/requirements";
import { monthLabel, parseMonthKey, shiftMonthKey, type CensusTier } from "@/lib/core-census/tier";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { CensusTable, type CensusTableRow } from "@/components/core-census/census-table";
import { TIER_HINT, TierBadge } from "@/components/core-census/census-badges";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Censo Core",
};

// Máximo acordado de miembros con el rol [SD] Core.
const CORE_MEMBER_CAP = 78;

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

const TIERS: CensusTier[] = ["S", "A", "B"];

export default async function CoreCensusPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const monthKey = parseMonthKey((await searchParams).mes);

  let members: CensusMember[] = [];
  let botError: string | null = null;
  try {
    members = await loadCensusMembers();
  } catch (err) {
    botError = err instanceof Error ? err.message : "Error desconocido";
  }
  if (botError) return <BotErrorNotice message={botError} />;

  const [events, summaries] = await Promise.all([loadMonthEvents(monthKey), loadMonthSummaries(monthKey)]);

  const rows: CensusTableRow[] = members.map((member) => ({
    discordId: member.discordId,
    displayName: member.displayName,
    username: member.username,
    avatarUrl: discordAvatarUrl(member.discordId, member.avatarHash, 32),
    characterName: member.characterName,
    job: member.job,
    requirements: SHEET_REQUIREMENTS.map((requirement) => ({
      value: formatRequirementValue(requirement, member.sheet),
      status: requirementStatus(requirement, member.sheet),
    })),
    summary: summaries.get(member.discordId) ?? null,
  }));

  const tierCounts = { S: 0, A: 0, B: 0 };
  for (const row of rows) {
    if (row.summary?.tier) tierCounts[row.summary.tier] += 1;
  }
  const censusedEvents = events.filter((event) => event.coreCensusAt).length;

  return (
    <div>
      <p className="max-w-3xl text-sm text-muted">
        {members.length} de {CORE_MEMBER_CAP} miembro(s) con el rol <code className="text-accent">[SD] Core</code>{" "}
        (ID <code className="text-accent">{CORE_GUILD_ROLE_ID}</code>). La ficha de equipo se compara contra los
        mínimos del core y la asistencia regular se evalúa mes a mes, contando juego y Discord.
        {members.length > CORE_MEMBER_CAP && (
          <span className="ml-1 text-rose-400">Hay más miembros Core que el máximo acordado.</span>
        )}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/core-guild/censo?mes=${shiftMonthKey(monthKey, -1)}`}
            aria-label="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:text-foreground"
          >
            <ChevronLeft size={16} />
          </Link>
          <h2 className="min-w-[150px] text-center text-lg font-semibold text-foreground">{monthLabel(monthKey)}</h2>
          <Link
            href={`/admin/core-guild/censo?mes=${shiftMonthKey(monthKey, 1)}`}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:text-foreground"
          >
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          {TIERS.map((tier) => (
            <span key={tier} className="flex items-center gap-2" title={TIER_HINT[tier]}>
              <TierBadge tier={tier} />
              {tierCounts[tier]}
            </span>
          ))}
        </div>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-foreground">Eventos del mes</h3>
          <p className="text-xs text-muted">
            {censusedEvents} de {events.length} censado(s). Solo los censados cuentan para el tier.
          </p>
        </div>

        {events.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No hay eventos creados para este mes. Se crean desde{" "}
            <Link href="/panel/eventos/nueva-semana" className="text-accent hover:underline">
              Eventos → Semana de asistencia
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/admin/core-guild/censo/evento/${event.id}`}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background-elevated p-3 hover:border-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {event.template.icon ? `${event.template.icon} ` : ""}
                      {EVENT_CATEGORY_LABEL[event.category]}
                    </span>
                    <span className="block text-xs text-muted">{EVENT_DATE_FORMATTER.format(event.startsAt)}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                      event.coreCensusAt
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-amber-500/40 text-amber-400"
                    }`}
                  >
                    {event.coreCensusAt ? "Censado" : "Pendiente"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-5">
        <CensusTable rows={rows} requirementLabels={SHEET_REQUIREMENTS.map((requirement) => requirement.label)} />
      </div>

      <p className="mt-3 text-xs text-muted">
        Mínimos: {SHEET_REQUIREMENTS.map((requirement) => requirement.hint).join(" · ")}. En verde lo que cumple, en
        rojo lo que no, y «—» lo que todavía no se evaluó. Toca un miembro para completar su ficha.
      </p>
    </div>
  );
}
