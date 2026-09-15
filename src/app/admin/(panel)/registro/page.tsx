import { prisma } from "@/lib/prisma";
import { loadEventChannelOptions } from "@/lib/discord-guild-channels";
import { RegistrationPublishForm } from "@/components/admin/registration-publish-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Registro",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

export default async function AdminRegistrationPage() {
  const [channels, settings, registrations] = await Promise.all([
    loadEventChannelOptions(),
    prisma.registrationSettings.findFirst(),
    prisma.memberRegistration.findMany({ orderBy: { updatedAt: "desc" } }),
  ]);
  const pilotCount = registrations.filter((registration) => registration.isPilot).length;

  return (
    <div>
      <p className="max-w-3xl text-sm text-muted">
        Boo publica en Discord un mensaje con el botón <strong>Registrarme / Actualizar datos</strong>. Quien
        lo envía recibe su rol de job y <strong>Pronterian@s</strong>, y su apodo del server pasa a ser su nick
        in-game. Los Pilot/Joki reciben solo Pronterian@s y <code className="text-accent">[Pilot]</code> en el
        apodo, así no ocupan lugar en los rosters.
      </p>

      <div className="mt-4">
        <RegistrationPublishForm channels={channels} currentChannelId={settings?.channelId ?? null} />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-foreground">Registrados</h2>
      <p className="text-sm text-muted">
        {registrations.length} registro(s), {pilotCount} Pilot/Joki.
      </p>

      {registrations.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Nick in-game</th>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Discord</th>
                <th className="px-4 py-2 font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {registrations.map((registration) => (
                <tr key={registration.id} className="hover:bg-surface/60">
                  <td className="px-4 py-2 text-foreground">{registration.nickname}</td>
                  <td className="px-4 py-2 text-muted">{registration.jobName}</td>
                  <td className="px-4 py-2 text-muted">{registration.isPilot ? "Pilot/Joki" : "Propia cuenta"}</td>
                  <td className="px-4 py-2 text-muted">@{registration.discordUsername}</td>
                  <td className="px-4 py-2 text-muted">{DATE_FORMATTER.format(registration.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
