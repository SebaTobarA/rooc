import { EventForm } from "@/components/forms/event-form";
import { createEvent } from "@/lib/actions/events";

export const metadata = { title: "Nuevo evento" };
export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo evento</h2>
      <EventForm action={createEvent} />
    </div>
  );
}
