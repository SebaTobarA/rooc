import { ImportForm } from "@/components/admin/import-form";

export const metadata = { title: "Importar CSV/JSON" };

export default function AdminImportPage() {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">Importación masiva</h2>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Sube un archivo CSV o JSON con el formato de columnas esperado para
        la tabla elegida abajo. Los registros existentes (mismo nombre/slug)
        se actualizan; el resto se crea. Si una fila tiene un error, se
        informa pero no bloquea la importación del resto.
      </p>

      <ImportForm />
    </div>
  );
}
