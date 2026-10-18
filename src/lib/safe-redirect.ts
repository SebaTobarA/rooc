/**
 * Normaliza el destino al que se vuelve después de iniciar sesión (`from`).
 * Solo se aceptan rutas internas: "//sitio-falso.com" o "/\sitio-falso.com"
 * empiezan con "/" pero el navegador las resuelve a otro dominio, y un link
 * de login legítimo de specialdelivery que termine en una página de phishing
 * es exactamente el truco que hay que evitar.
 */
export function safeRedirectPath(from: string | null | undefined, fallback: string): string {
  if (!from || !from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\\]/.test(from)) return fallback;
  try {
    const url = new URL(from, "https://interno.invalid");
    if (url.origin !== "https://interno.invalid") return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // "/a/../..//sitio-falso.com" se normaliza a "//sitio-falso.com".
    return path.startsWith("//") ? fallback : path;
  } catch {
    return fallback;
  }
}
