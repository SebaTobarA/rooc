import { MapForm } from "@/components/forms/map-form";
import { createMap } from "@/lib/actions/maps";
import { BackLink } from "@/components/admin/back-link";

export const metadata = { title: "Nuevo mapa" };

export default function NewMapPage() {
  return (
    <div>
      <BackLink href="/admin/maps" label="Mapas" />
      <h2 className="mb-4 text-lg font-semibold text-foreground">Nuevo mapa</h2>
      <MapForm action={createMap} />
      <p className="mt-3 max-w-2xl text-xs text-muted">
        Después de crear el mapa vas a poder agregarle NPCs y asociar
        monstruos desde su pantalla de edición (los monstruos también se
        pueden asociar desde la edición de cada monstruo).
      </p>
    </div>
  );
}
