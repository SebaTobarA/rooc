import type { Metadata } from "next";
import Link from "next/link";
import { DiscordIcon } from "@/components/marketing/discord-icon";

const DISCORD_INVITE_URL = "https://discord.gg/XnTrEKEGw";
const OFFICIAL_DOMAIN = "specialdelivery.vercel.app";

export const metadata: Metadata = {
  title: "Seguridad",
  description:
    "Cómo reconocer el sitio oficial de Special Delivery, qué datos usa y qué nunca te va a pedir. Cómo reportar intentos de phishing.",
};

/**
 * Página pública para que los miembros reconozcan el sitio oficial y no
 * caigan en copias falsas: dominio, cómo funciona el inicio de sesión, qué
 * datos se usan y qué no se pide nunca.
 */
export default function SeguridadPage() {
  return (
    <>
      <section className="reclutamiento-hero">
        <div className="reclutamiento-hero-ghost-wrap" aria-hidden="true">
          <img src="/assets/mascota-fantasma-icono.svg" alt="" className="reclutamiento-hero-ghost" />
        </div>

        <Link href="/#inicio" className="back-link">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          Volver al inicio
        </Link>
        <span className="eyebrow">Tu cuenta, protegida</span>
        <h1 className="reclutamiento-hero-title">Seguridad</h1>
        <p className="reclutamiento-hero-text">
          El único sitio oficial de Special Delivery es <strong>{OFFICIAL_DOMAIN}</strong>. Aquí te explicamos cómo
          reconocerlo y qué nunca te vamos a pedir.
        </p>
      </section>

      <section className="section watermark-host">
        <div className="watermark" aria-hidden="true"><span>Nunca</span></div>
        <div className="section-inner">
          <span className="eyebrow reveal">Para que no te engañen</span>
          <h2 className="section-subtitle reveal">Lo que Special Delivery nunca te va a pedir</h2>

          <ul className="requirements-grid reveal-stagger">
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Contraseñas</span>
              <p className="requirement-card-value">Ni la de Discord, ni la del juego, ni la de tu correo. Ningún oficial te la va a pedir.</p>
            </li>
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Códigos y tokens</span>
              <p className="requirement-card-value">Códigos de verificación, códigos QR para «iniciar sesión» ni tokens de Discord.</p>
            </li>
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Pagos</span>
              <p className="requirement-card-value">Tarjetas, transferencias, Nitro ni ítems del juego a cambio de entrar a la guild.</p>
            </li>
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Descargas</span>
              <p className="requirement-card-value">Programas, «launchers» ni archivos para instalar. El sitio funciona solo en el navegador.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="section section-alt watermark-host">
        <div className="watermark" aria-hidden="true"><span>Oficial</span></div>
        <div className="section-inner">
          <span className="eyebrow reveal">Antes de iniciar sesión</span>
          <h2 className="section-subtitle reveal">Cómo reconocer el sitio oficial</h2>

          <ol className="process-steps reveal-stagger">
            <li className="process-step reveal">
              <h3 className="process-step-title">Revisa la dirección</h3>
              <p className="process-step-text">
                Debe decir exactamente <strong>https://{OFFICIAL_DOMAIN}</strong>, con el candado del navegador. Desconfía de
                variantes como «special-delivery», «specialdeIivery» (con I mayúscula) u otros dominios.
              </p>
            </li>
            <li className="process-step reveal">
              <h3 className="process-step-title">El login es en discord.com</h3>
              <p className="process-step-text">
                «Iniciar sesión con Discord» te lleva a la página oficial de Discord (discord.com), que solo nos comparte tu
                nombre de usuario y avatar. Si una página te pide escribir tu correo y contraseña de Discord fuera de
                discord.com, es phishing.
              </p>
            </li>
            <li className="process-step reveal">
              <h3 className="process-step-title">El bot oficial es Boo</h3>
              <p className="process-step-text">
                Los avisos de eventos y postulaciones los publica Boo dentro del server. Si recibes un mensaje directo de
                «Special Delivery» con un link raro, no lo abras y avísale a un oficial.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section watermark-host">
        <div className="watermark" aria-hidden="true"><span>Datos</span></div>
        <div className="section-inner">
          <span className="eyebrow reveal">Transparencia</span>
          <h2 className="section-subtitle reveal">Qué datos usamos</h2>
          <div className="info-card culture-card reveal">
            <p className="section-text">
              De Discord solo usamos tu ID, nombre de usuario, avatar y roles del server, para saber que eres miembro y qué
              puedes ver en el panel. No tenemos acceso a tus mensajes, a tu correo ni a tu contraseña. Las capturas de
              postulación se guardan con un enlace imposible de adivinar y solo se muestran a los oficiales de
              reclutamiento. Toda la conexión va cifrada (HTTPS) y la sesión dura
              7 días; puedes cerrarla cuando quieras desde el panel.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-alt watermark-host">
        <div className="watermark" aria-hidden="true"><span>Reportar</span></div>
        <div className="section-inner">
          <span className="eyebrow reveal">¿Viste algo raro?</span>
          <h2 className="section-subtitle reveal">Reporta un intento de phishing</h2>
          <p className="section-text reveal">
            Si alguien te mandó un link sospechoso a nombre de la guild, o encontraste una copia del sitio, avísale a un
            oficial por Discord con una captura. Si ya escribiste tu contraseña en otro sitio, cámbiala de inmediato y activa
            la verificación en dos pasos de Discord.
          </p>
          <div className="hero-actions reveal">
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-discord btn-large">
              <DiscordIcon />
              <span>Avisar en el Discord</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
