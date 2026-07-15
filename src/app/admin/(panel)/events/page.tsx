import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EVENT_CATEGORY_LABEL, EVENT_STATUS_LABEL } from "@/lib/labels";

export const metadata = { title: "Eventos" };
export const dynamic = "force-dynamic";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ orderBy: { startsAt: "desc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Eventos ({events.length})</h2>
        <Link href="/admin/events/new" className="btn-brand px-3 py-1.5 text-sm">
          + Nuevo evento
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Título</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-2 text-foreground">
                  <Link href={`/admin/events/${event.id}`} className="hover:text-accent hover:underline">
                    {event.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted">{EVENT_CATEGORY_LABEL[event.category]}</td>
                <td className="px-4 py-2 text-muted">{DATE_FORMATTER.format(event.startsAt)}</td>
                <td className="px-4 py-2 text-muted">{EVENT_STATUS_LABEL[event.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
