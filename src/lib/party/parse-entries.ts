/**
 * Parsea un texto pegado de Excel, CSV o texto libre y devuelve
 * entradas en formato "nick,clase". Soporta:
 *   - Excel: celdas separadas por tabulaciones
 *   - CSV: comas o punto y coma
 *   - Lista libre: Nick,Clase;Nick,Clase
 */
export function parseEntries(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries: string[] = [];

  for (const line of lines) {
    if (line.includes("\t")) {
      // Excel: columnas separadas por tabulaciones
      const cols = line.split("\t").map((s) => s.trim()).filter(Boolean);
      if (cols.length >= 2) entries.push(`${cols[0]},${cols[1]}`);
    } else if (line.includes(";")) {
      // Lista tipo Nick,Clase;Nick,Clase
      for (const segment of line.split(";").map((s) => s.trim()).filter(Boolean)) {
        const parts = segment.split(",").map((s) => s.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          entries.push(`${parts[0]},${parts[1]}`);
        }
      }
    } else if (line.includes(",")) {
      // CSV: una fila con comas
      const cols = line.split(",").map((s) => s.trim()).filter(Boolean);
      if (cols.length >= 2) entries.push(`${cols[0]},${cols[1]}`);
    } else if (line) {
      // Entrada sin separador conocido, se guarda para reportar como inválida
      entries.push(line);
    }
  }

  return entries;
}
