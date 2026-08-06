import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AttendanceWeekForm } from "@/components/forms/attendance-week-form";
import { createAttendanceWeek } from "@/lib/actions/attendance-week";
import { BackLink } from "@/components/back-link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva semana de asistencia" };

export default async function NewAttendanceWeekPage() {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);

  if (!permissions.canManageParty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted">
          Tu rol no tiene habilitada la administración de eventos.
        </p>
      </div>
    );
  }

  const [guildLeagueTemplates, emperiumTemplates] = await Promise.all([
    prisma.eventTemplate.findMany({
      where: { category: "GUILD_LEAGUE", attendanceMode: "DECLINE" },
      orderBy: { title: "asc" },
    }),
    prisma.eventTemplate.findMany({
      where: { category: "EMPERIUM_OVERRUN", attendanceMode: "DECLINE" },
      orderBy: { title: "asc" },
    }),
  ]);

  const missingTemplates = guildLeagueTemplates.length === 0 || emperiumTemplates.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <BackLink href="/panel/eventos" label="Eventos" />
      <h1 className="mb-4 text-lg font-semibold text-foreground">Nueva semana de asistencia</h1>
      {missingTemplates ? (
        <p className="text-sm text-muted">
          Necesitas al menos un template de Guild League y uno de War of Emperium en modo &quot;Marcar
          inasistencia&quot; — ve a{" "}
          <Link href="/panel/eventos" className="text-accent hover:underline">
            Eventos
          </Link>{" "}
          y creá o editá los templates primero.
        </p>
      ) : (
        <AttendanceWeekForm
          guildLeagueTemplates={guildLeagueTemplates}
          emperiumTemplates={emperiumTemplates}
          action={createAttendanceWeek}
        />
      )}
    </div>
  );
}
