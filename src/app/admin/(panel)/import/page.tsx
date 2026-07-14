import { ImportForm } from "@/components/admin/import-form";

export const metadata = { title: "Importar CSV/JSON" };

export default function AdminImportPage() {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">Importación masiva</h2>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Subí un archivo CSV o JSON con el formato de columnas esperado para
        cada tabla. Los registros existentes (mismo nombre/slug) se
        actualizan; el resto se crea. Si una fila tiene un error, se informa
        pero no bloquea la importación del resto.
      </p>

      <div className="mb-6 max-w-2xl rounded-xl border border-dashed border-border p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Formato esperado (columnas):</p>
        <ul className="mt-2 space-y-1">
          <li>
            <strong className="text-foreground">Equipamiento:</strong> name, category,
            slot, weaponType, levelReq, rarity, description, stats, iconUrl
          </li>
          <li>
            <strong className="text-foreground">Monstruos:</strong> name, level,
            hp, atk, atkMax, def, element, elementLevel, race, size,
            description, iconUrl
          </li>
          <li>
            <strong className="text-foreground">Mapas:</strong> name, region,
            description
          </li>
          <li>
            <strong className="text-foreground">Drops:</strong> monster
            (nombre o slug), item (nombre o slug), rate
          </li>
        </ul>
        <p className="mt-2">
          Archivos de ejemplo completos en{" "}
          <code className="rounded bg-background-elevated px-1 py-0.5">
            data/examples/
          </code>{" "}
          dentro del repositorio (uno .csv y uno .json por tabla).
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
