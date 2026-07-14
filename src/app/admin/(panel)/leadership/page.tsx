import { prisma } from "@/lib/prisma";
import { getGuildMembers, type DiscordGuildMember } from "@/lib/discord-bot";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { MemberPicker } from "@/components/admin/member-picker";
import {
  createPosition,
  updatePositionTitle,
  deletePosition,
  movePosition,
  updateMemberNickname,
  removeMember,
} from "@/lib/actions/leadership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Liderazgo",
};

export default async function AdminLeadershipPage() {
  const positions = await prisma.leadershipPosition.findMany({
    orderBy: { order: "asc" },
    include: { members: { orderBy: { order: "asc" } } },
  });

  let guildMembers: DiscordGuildMember[] = [];
  let guildMembersError: string | null = null;
  try {
    guildMembers = await getGuildMembers();
  } catch (err) {
    guildMembersError = err instanceof Error ? err.message : "Error desconocido";
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Los cargos y sus miembros se muestran en la sección &quot;Liderazgo&quot; de la web
        principal, en el mismo orden en que aparecen acá. El primer cargo de la lista lleva el
        acento dorado (Guild Leader).
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {positions.map((position, index) => (
          <div key={position.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <form
                action={updatePositionTitle.bind(null, position.id)}
                className="flex flex-1 items-center gap-2"
              >
                <input
                  name="title"
                  defaultValue={position.title}
                  className="flex-1 rounded-md border border-border bg-background-elevated px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  Guardar
                </button>
              </form>

              <div className="flex shrink-0 items-center gap-1">
                <form action={movePosition.bind(null, position.id, "up")}>
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-30"
                    aria-label="Subir cargo"
                  >
                    ↑
                  </button>
                </form>
                <form action={movePosition.bind(null, position.id, "down")}>
                  <button
                    type="submit"
                    disabled={index === positions.length - 1}
                    className="rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-30"
                    aria-label="Bajar cargo"
                  >
                    ↓
                  </button>
                </form>
                <form action={deletePosition.bind(null, position.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:text-accent"
                  >
                    Eliminar cargo
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {position.members.map((member) => {
                const avatar = discordAvatarUrl(member.discordId, member.discordAvatarHash, 40);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-background-elevated px-3 py-2"
                  >
                    {avatar ? (
                      <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs text-muted">
                        {member.nickname.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs text-muted">@{member.discordUsername}</span>
                    <form
                      action={updateMemberNickname.bind(null, member.id)}
                      className="ml-auto flex items-center gap-2"
                    >
                      <input
                        name="nickname"
                        defaultValue={member.nickname}
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                      >
                        Guardar
                      </button>
                    </form>
                    <form action={removeMember.bind(null, member.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-accent"
                      >
                        Quitar
                      </button>
                    </form>
                  </div>
                );
              })}
              {position.members.length === 0 && (
                <p className="text-xs text-muted">Sin miembros todavía.</p>
              )}
            </div>

            <div className="mt-3">
              {guildMembersError ? (
                <p className="text-xs text-muted">
                  No se pudo cargar la lista de miembros del server para agregar más ({guildMembersError}).
                </p>
              ) : (
                <MemberPicker positionId={position.id} members={guildMembers} />
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        action={createPosition}
        className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border p-4"
      >
        <input
          name="title"
          placeholder="Nombre del nuevo cargo (ej: Oficiales)"
          required
          className="flex-1 rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <button type="submit" className="btn-brand px-4 py-2 text-sm">
          + Agregar cargo
        </button>
      </form>
    </div>
  );
}
