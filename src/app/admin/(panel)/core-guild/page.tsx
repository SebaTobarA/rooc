import "@/app/panel/party/party.css";
import "./core-guild.css";
import { prisma } from "@/lib/prisma";
import { getCoreGuildRoster, CORE_GUILD_ROLE_ID } from "@/lib/core-guild/sync";
import { getGuildChannels } from "@/lib/discord-bot";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { CoreGuildManager } from "@/components/core-guild/core-guild-manager";
import type { SavedCoreGuildBoard } from "@/lib/core-guild/use-core-guild-board";
import type { CoreGuildBoardData } from "@/lib/core-guild/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Core Guild",
};

export default async function AdminCoreGuildPage() {
  let roster: Awaited<ReturnType<typeof getCoreGuildRoster>> = [];
  let channels: Awaited<ReturnType<typeof getGuildChannels>> = [];
  let error: string | null = null;

  try {
    [roster, channels] = await Promise.all([getCoreGuildRoster(), getGuildChannels()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Error desconocido";
  }

  if (error) {
    return <BotErrorNotice message={error} />;
  }

  const row = await prisma.coreGuildBoard.findFirst();
  const saved: SavedCoreGuildBoard | null = row
    ? {
        data: row.data as unknown as CoreGuildBoardData,
        locked: row.locked,
        updatedByUsername: row.updatedByUsername,
        updatedAt: row.updatedAt.toISOString(),
      }
    : null;

  return (
    <div>
      <p className="text-sm text-muted">
        {roster.length} miembro(s) con el rol <code className="text-accent">[SD] Core</code> (ID{" "}
        <code className="text-accent">{CORE_GUILD_ROLE_ID}</code>) en el server. Clasificalos, armá
        las parties y repartilas entre guilds — nada se guarda hasta apretar &quot;Guardar&quot;.
      </p>

      <div className="mt-4">
        <CoreGuildManager roster={roster} saved={saved} channels={channels} />
      </div>
    </div>
  );
}
