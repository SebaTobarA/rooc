import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/forms/event-form";
import { createEvent } from "@/lib/actions/events";
import { BackLink } from "@/components/back-link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo evento" };

export default async function NewEventPage() {
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

  const templates = await prisma.eventTemplate.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <BackLink href="/panel/eventos" label="Eventos" />
      <h1 className="mb-4 text-lg font-semibold text-foreground">Nuevo evento</h1>
      {templates.length === 0 ? (
        <p className="text-sm text-muted">
          Todavía no hay ningún template creado — ve a{" "}
          <Link href="/panel/eventos" className="text-accent hover:underline">
            Eventos
          </Link>{" "}
          y crea uno primero.
        </p>
      ) : (
        <EventForm templates={templates} action={createEvent} />
      )}
    </div>
  );
}
