import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getGuildMember, getGuildRoles } from "@/lib/discord-bot";
import { listJobGuildRoles, resolveJobFromRoles } from "@/lib/discord-job-roles";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { CORE_GUILD_ROLE_ID } from "@/lib/core-guild/sync";
import { siteConfig } from "@/config/site";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { ClassEditor } from "@/components/panel/class-editor";

/**
 * El perfil del jugador dentro del inicio del panel (/panel), en dos bloques:
 * a la izquierda quién es, con su clase editable debajo; a la derecha lo que
 * reciba en `aside` (sus notificaciones). Su ficha Core vive en
 * /panel/personaje.
 */
export async function ProfileSection({ discordId, aside }: { discordId: string; aside: ReactNode }) {
  const user = await prisma.user.findUnique({ where: { discordId } });

  let guildRoles: Awaited<ReturnType<typeof getGuildRoles>> = [];
  let member: Awaited<ReturnType<typeof getGuildMember>> = null;
  let botError: string | null = null;
  try {
    [guildRoles, member] = await Promise.all([getGuildRoles(), getGuildMember(discordId)]);
  } catch (err) {
    botError = err instanceof Error ? err.message : "Error desconocido";
  }

  if (botError) return <BotErrorNotice message={botError} />;

  if (!member) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="font-semibold text-foreground">No encontramos tu membresía en Discord</p>
        <p className="mt-1 text-sm text-muted">
          Puede que hayas salido del server. Vuelve a entrar e inténtalo de nuevo.
        </p>
      </div>
    );
  }

  // El rol en Discord es la fuente de verdad — si cambió desde el último
  // login (o desde el último guardado acá), sincronizamos el cache local
  // ahora para que el resto del panel (ej. la tarjeta del sidebar) no
  // quede mostrando una clase vieja.
  const rolesChanged =
    !user || JSON.stringify([...user.roles].sort()) !== JSON.stringify([...member.roles].sort());
  if (rolesChanged && user) {
    await prisma.user.update({ where: { discordId }, data: { roles: member.roles } });
  }

  const jobRoles = listJobGuildRoles(guildRoles);
  const currentJob = resolveJobFromRoles(member.roles, guildRoles);
  const currentRoleId = jobRoles.find((role) => role.name === currentJob)?.id ?? null;

  const displayName = user?.globalName ?? member.user.global_name ?? member.user.username;
  const gameNick = member.nick ?? displayName;
  const avatarUrl = discordAvatarUrl(member.user.id, member.user.avatar, 96);
  const isCore = member.roles.includes(CORE_GUILD_ROLE_ID);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="profile-card__avatar">
              <span className="profile-card__avatar-glow" />
              <span className="profile-card__ring">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" width={80} height={80} className="block h-20 w-20 rounded-full bg-surface" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-background-elevated text-2xl font-semibold text-muted">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="heading-gradient text-2xl font-extrabold sm:text-3xl">{gameNick}</h1>
              <p className="text-sm text-muted">@{member.user.username}</p>
              <div className="mt-1 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
                  Guild: {siteConfig.name}
                </span>
                {isCore && (
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                    [SD] Core
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-5">
            {jobRoles.length > 0 ? (
              <ClassEditor jobRoles={jobRoles} currentRoleId={currentRoleId} />
            ) : (
              <p className="text-sm text-muted">Todavía no hay roles de clase configurados en el server de Discord.</p>
            )}
          </div>
        </section>

        {aside}
      </div>

    </>
  );
}
