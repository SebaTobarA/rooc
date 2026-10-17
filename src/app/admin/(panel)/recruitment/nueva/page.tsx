import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { getGuildMembers } from "@/lib/discord-bot";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";
import { createCandidate } from "@/lib/actions/recruitment";
import { BackLink } from "@/components/back-link";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import {
  CandidateMemberSelect,
  type CandidateMemberOption,
} from "@/components/recruitment/candidate-member-select";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nueva ficha de candidato",
};

const FIELD_CLASS =
  "mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

/** Alta manual de un candidato que no postuló desde el panel: se elige de los miembros del server. */
export default async function NewCandidatePage() {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageRecruitment) {
    return <p className="text-sm text-muted">Tu rol no tiene habilitada la gestión de reclutamiento.</p>;
  }

  let members: CandidateMemberOption[] = [];
  let botError: string | null = null;
  try {
    members = (await getGuildMembers())
      .filter((member) => !member.user.bot)
      .map((member) => ({
        id: member.user.id,
        label: member.nick ?? member.user.global_name ?? member.user.username,
        username: member.user.username,
        avatarUrl: discordAvatarUrl(member.user.id, member.user.avatar, 32),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (err) {
    botError = err instanceof Error ? err.message : "Error desconocido";
  }

  return (
    <div className="max-w-2xl">
      <BackLink href="/admin/recruitment" label="Reclutamiento" />
      {botError && <BotErrorNotice message={botError} />}

      <form action={createCandidate} className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">Nueva ficha de candidato</h2>
        <p className="mt-1 text-sm text-muted">
          Elige al candidato entre los miembros del server de Discord. Después completas el resto de su ficha. Si ya
          había postulado, se abre su ficha existente.
        </p>

        <div className="mt-4">
          <span className="text-xs text-muted">Candidato en Discord</span>
          <div className="mt-1">
            <CandidateMemberSelect members={members} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-muted">
            Nick in-game
            <input type="text" name="characterName" maxLength={60} placeholder="Su apodo del server" className={FIELD_CLASS} />
          </label>
          <label className="block text-xs text-muted">
            Clase actual
            <select name="className" defaultValue="" className={FIELD_CLASS}>
              <option value="">Sin definir</option>
              {JOB_ROLE_NAMES.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" className="btn-brand mt-5 px-4 py-2 text-sm">
          Crear ficha
        </button>
      </form>
    </div>
  );
}
