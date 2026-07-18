import { NextResponse } from "next/server";
import { detectFormat, parseRows } from "@/lib/import/parse";
import { importersByEntity, type ImportEntity } from "@/lib/import/importers";

const VALID_ENTITIES: ImportEntity[] = ["items", "cards", "monsters", "maps", "drops", "skills"];

/**
 * Endpoint de importación masiva usado por /admin/import. Protegido por
 * middleware.ts (requiere sesión de admin válida).
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const entity = formData.get("entity");
  const file = formData.get("file");

  if (typeof entity !== "string" || !VALID_ENTITIES.includes(entity as ImportEntity)) {
    return NextResponse.json(
      { error: `"entity" debe ser uno de: ${VALID_ENTITIES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo a importar." }, { status: 400 });
  }

  try {
    const content = await file.text();
    const format = detectFormat(file.name);
    const rows = parseRows(content, format);
    const summary = await importersByEntity[entity as ImportEntity](rows);
    return NextResponse.json({ ok: true, rowCount: rows.length, summary });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo procesar el archivo: ${(err as Error).message}` },
      { status: 400 }
    );
  }
}
