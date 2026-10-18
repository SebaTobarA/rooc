/**
 * El login de admin con usuario/contraseña es un respaldo por si Discord no
 * responde. Queda apagado salvo que se active a propósito con
 * ADMIN_PASSWORD_LOGIN_ENABLED=true: un formulario que pide contraseña en el
 * sitio confunde a los miembros (el sitio nunca pide la de Discord) y es un
 * blanco para adivinar contraseñas. Aun activado, exige una contraseña larga.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = 16;

export function isPasswordLoginEnabled(): boolean {
  return (
    process.env.ADMIN_PASSWORD_LOGIN_ENABLED === "true" &&
    (process.env.ADMIN_USERNAME ?? "").length > 0 &&
    (process.env.ADMIN_PASSWORD ?? "").length >= MIN_ADMIN_PASSWORD_LENGTH
  );
}
