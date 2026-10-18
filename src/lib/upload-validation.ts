/**
 * Validación común de las imágenes que se suben al blob público. Solo
 * formatos raster: un SVG puede llevar scripts adentro, y el tipo que manda
 * el navegador lo controla quien sube, así que además se revisa la firma de
 * los primeros bytes del archivo.
 */
const SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/gif": (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  "image/webp": (b) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
};

export const ALLOWED_IMAGE_TYPES = Object.keys(SIGNATURES);

/** null si la imagen es válida, o el mensaje de error para mostrar. */
export async function validateImageUpload(file: File, maxBytes: number): Promise<string | null> {
  const matchesSignature = SIGNATURES[file.type];
  if (!matchesSignature) return "La imagen debe ser PNG, JPG, WEBP o GIF.";
  if (file.size > maxBytes) return `La imagen no puede superar los ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesSignature(head)) return "El archivo no es una imagen válida.";
  return null;
}
