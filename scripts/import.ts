/**
 * Importación masiva por línea de comandos.
 *
 * Uso:
 *   npm run import -- --type items --file data/mis-items.csv
 *   npm run import -- --type monsters --file data/mis-monstruos.json
 *
 * --type acepta: items | cards | monsters | maps | drops
 * El formato (CSV o JSON) se detecta por la extensión del archivo.
 * Ver data/examples/ para el formato de columnas esperado de cada tabla.
 */
import { readFileSync } from "node:fs";
import { detectFormat, parseRows } from "../src/lib/import/parse";
import { importersByEntity, type ImportEntity } from "../src/lib/import/importers";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i++;
    }
  }
  return args;
}

const VALID_TYPES: ImportEntity[] = ["items", "cards", "monsters", "maps", "drops"];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = args.type as ImportEntity | undefined;
  const file = args.file;

  if (!type || !VALID_TYPES.includes(type)) {
    console.error(`--type es obligatorio y debe ser uno de: ${VALID_TYPES.join(", ")}`);
    process.exit(1);
  }
  if (!file) {
    console.error("--file es obligatorio (ruta al CSV o JSON a importar).");
    process.exit(1);
  }

  const content = readFileSync(file, "utf-8");
  const format = detectFormat(file);
  const rows = parseRows(content, format);

  console.log(`Importando ${rows.length} fila(s) de "${file}" como "${type}"...`);

  const summary = await importersByEntity[type](rows);

  console.log(`Creados: ${summary.created} · Actualizados: ${summary.updated}`);
  if (summary.errors.length > 0) {
    console.log(`Filas con error (${summary.errors.length}):`);
    for (const error of summary.errors) console.log(`  - ${error}`);
  }
}

main()
  .catch((err) => {
    console.error("Error inesperado durante la importación:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
