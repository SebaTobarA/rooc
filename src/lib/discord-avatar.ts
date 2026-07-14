// La CDN de Discord solo acepta potencias de 2 en el parámetro `size`
// (16, 32, 64, ..., 4096) — cualquier otro valor devuelve un error "Invalid
// resource". Se redondea hacia arriba a la potencia de 2 válida más cercana
// para que cualquier tamaño pedido funcione sin tener que recordar la regla.
const VALID_SIZES = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096];

function nearestValidSize(size: number): number {
  return VALID_SIZES.find((valid) => valid >= size) ?? VALID_SIZES[VALID_SIZES.length - 1];
}

/** URL del avatar de Discord a partir del ID de usuario y el hash de avatar. Null si no tiene avatar personalizado (se usa una inicial como respaldo en la UI). */
export function discordAvatarUrl(
  discordId: string,
  avatarHash: string | null | undefined,
  size = 64
): string | null {
  if (!avatarHash) return null;
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=${nearestValidSize(size)}`;
}
