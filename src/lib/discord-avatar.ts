/** URL del avatar de Discord a partir del ID de usuario y el hash de avatar. Null si no tiene avatar personalizado (se usa una inicial como respaldo en la UI). */
export function discordAvatarUrl(
  discordId: string,
  avatarHash: string | null | undefined,
  size = 64
): string | null {
  if (!avatarHash) return null;
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=${size}`;
}
