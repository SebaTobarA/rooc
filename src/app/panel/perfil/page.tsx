import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuildMember, getGuildRoles } from "@/lib/discord-bot";
import { listJobGuildRoles, resolveJobFromRoles } from "@/lib/discord-job-roles";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { siteConfig } from "@/config/site";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { ClassEditor } from "@/components/panel/class-editor";
import { BuildClassTabs } from "@/components/panel/build-class-tabs";

export const metadata = {
  title: "Mi perfil",
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.discordId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-semibold text-foreground">Este perfil requiere Discord</p>
          <p className="mt-1 text-sm text-muted">
            Iniciá sesión con tu cuenta de Discord para ver y editar tu perfil de personaje.
          </p>
        </div>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });

  let guildRoles: Awaited<ReturnType<typeof getGuildRoles>> = [];
  let member: Awaited<ReturnType<typeof getGuildMember>> = null;
  let botError: string | null = null;
  try {
    [guildRoles, member] = await Promise.all([
      getGuildRoles(),
      getGuildMember(session.discordId),
    ]);
  } catch (err) {
    botError = err instanceof Error ? err.message : "Error desconocido";
  }

  if (botError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <BotErrorNotice message={botError} />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-semibold text-foreground">No encontramos tu membresía en Discord</p>
          <p className="mt-1 text-sm text-muted">
            Puede que hayas salido del server. Volvé a entrar y reintentá.
          </p>
        </div>
      </div>
    );
  }

  // El rol en Discord es la fuente de verdad — si cambió desde el último
  // login (o desde el último guardado acá), sincronizamos el cache local
  // ahora para que el resto del panel (ej. la tarjeta del sidebar) no
  // quede mostrando una clase vieja.
  const rolesChanged =
    !user || JSON.stringify([...user.roles].sort()) !== JSON.stringify([...member.roles].sort());
  if (rolesChanged) {
    await prisma.user.update({
      where: { discordId: session.discordId },
      data: { roles: member.roles },
    });
  }

  const jobRoles = listJobGuildRoles(guildRoles);
  const currentJob = resolveJobFromRoles(member.roles, guildRoles);
  const currentRoleId = jobRoles.find((role) => role.name === currentJob)?.id ?? null;

  const displayName = user?.globalName ?? member.user.global_name ?? member.user.username;
  const gameNick = member.nick ?? displayName;
  const avatarUrl = discordAvatarUrl(member.user.id, member.user.avatar, 96);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="profile-card__avatar">
            <span className="profile-card__avatar-glow" />
            <span className="profile-card__ring">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  width={80}
                  height={80}
                  className="block h-20 w-20 rounded-full bg-surface"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-background-elevated text-2xl font-semibold text-muted">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-bold text-foreground">{gameNick}</h1>
            <p className="text-sm text-muted">@{member.user.username}</p>
            <span className="mt-1 w-fit rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
              Guild: {siteConfig.name}
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          {jobRoles.length > 0 ? (
            <ClassEditor jobRoles={jobRoles} currentRoleId={currentRoleId} />
          ) : (
            <p className="text-sm text-muted">
              Todavía no hay roles de clase configurados en el server de Discord.
            </p>
          )}
        </div>
      </section>

      <div className="mt-8">
        <BuildClassTabs />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">
          Composición de Party en Guild League y Emperium Overrun
        </h2>
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-semibold text-foreground">En construcción</p>
          <p className="mt-1 text-sm text-muted">
            Acá vas a poder ver en qué parties te ubicaron para Guild League y Emperium Overrun.
          </p>
        </div>
      </section>
    </div>
  );
}
