import { parse as parseCsv } from "csv-parse/sync";

export type RawRow = Record<string, string>;
export type ImportFormat = "csv" | "json";

/** Detecta el formato por extensión de archivo. */
export function detectFormat(filename: string): ImportFormat {
  return filename.toLowerCase().endsWith(".json") ? "json" : "csv";
}

/**
 * Convierte el contenido crudo del archivo (CSV o JSON) en un array de filas
 * "planas" (objetos con valores string), sin validar todavía los campos de
 * cada entidad. Esa validación específica vive en importers.ts.
 */
export function parseRows(fileContent: string, format: ImportFormat): RawRow[] {
  if (format === "json") {
    const data = JSON.parse(fileContent);
    if (!Array.isArray(data)) {
      throw new Error("El archivo JSON debe contener un array de objetos en su raíz.");
    }
    // Normaliza todos los valores a string para que los importers (que
    // esperan RawRow) los procesen igual que si vinieran de un CSV.
    return data.map((row: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, value === null || value === undefined ? "" : String(value)])
      )
    );
  }

  return parseCsv(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawRow[];
}
