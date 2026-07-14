import type { Metadata } from "next";
import Link from "next/link";
import { DiscordIcon } from "@/components/marketing/discord-icon";

const DISCORD_INVITE_URL = "https://discord.gg/XnTrEKEGw";

export const metadata: Metadata = {
  title: "Reclutamiento",
  description:
    "Reclutamiento de Special Delivery: gremio de Ragnarok Online Origin Classic. Conoce qué buscamos, los requisitos y cómo postular por Discord.",
};

export default function ReclutamientoPage() {
  return (
    <>
      {/* ============ HERO DE RECLUTAMIENTO ============ */}
      <section className="reclutamiento-hero">
        <div className="reclutamiento-hero-ghost-wrap" aria-hidden="true">
          <img src="/assets/mascota-fantasma-icono.svg" alt="" className="reclutamiento-hero-ghost" />
        </div>

        <Link href="/#inicio" className="back-link">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          Volver al inicio
        </Link>
        <span className="eyebrow">Reclutamiento abierto</span>
        <h1 className="reclutamiento-hero-title">Únete a Special Delivery</h1>
        <p className="reclutamiento-hero-text">Buscamos jugadores comprometidos que quieran crecer junto al gremio en Ragnarok Origin: Classic — competitivos cuando importa, buena onda siempre.</p>
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-discord btn-large">
          <DiscordIcon />
          <span>Postular por Discord</span>
          <span className="discord-online" data-discord-online hidden>
            <span className="discord-online-dot" aria-hidden="true"></span>
            <span className="discord-online-count" data-discord-online-count></span>
          </span>
        </a>
      </section>

      {/* ============ QUÉ BUSCAMOS ============ */}
      <section className="section watermark-host">
        <div className="watermark" aria-hidden="true"><span>Actitud</span></div>
        <div className="section-inner">
          <span className="eyebrow reveal">Nuestra cultura</span>
          <h2 className="section-subtitle reveal">Qué buscamos en un nuevo miembro</h2>
          <div className="info-card culture-card reveal">
            <p className="section-text">No buscamos solo números para llenar el gremio: buscamos gente con actitud. Jugadores que se toman en serio lo competitivo cuando toca (Guild League, WoE, contenido de guild), pero que también disfrutan del server sin pelear entre ellos. Si te gusta progresar en equipo, participar activamente y sumar en vez de restar, encajas con Special Delivery.</p>
          </div>
        </div>
      </section>

      {/* ============ REQUISITOS ============ */}
      <section className="section section-alt watermark-host">
        <div className="watermark" aria-hidden="true"><span>Requisitos</span></div>
        <div className="section-inner">
          <span className="eyebrow reveal">Antes de postular</span>
          <h2 className="section-subtitle reveal">Requisitos</h2>

          <ul className="requirements-grid reveal-stagger">
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Nivel mínimo</span>
              <p className="requirement-card-value">Por definir</p>
            </li>
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Clases buscadas</span>
              <p className="requirement-card-value">Por definir</p>
            </li>
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Disponibilidad horaria</span>
              <p className="requirement-card-value">Por definir</p>
            </li>
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Discord y eventos</span>
              <p className="requirement-card-value">Uso activo de Discord y participación en eventos de guild</p>
            </li>
            <li className="requirement-card reveal">
              <span className="requirement-card-label">Actitud</span>
              <p className="requirement-card-value">Compromiso, respeto y ganas de crecer en equipo</p>
            </li>
          </ul>
        </div>
      </section>

      {/* ============ PROCESO DE POSTULACIÓN ============ */}
      <section className="section watermark-host">
        <div className="watermark" aria-hidden="true"><span>Proceso</span></div>
        <div className="section-inner">
          <span className="eyebrow reveal">Cómo funciona</span>
          <h2 className="section-subtitle reveal">Proceso de postulación</h2>

          <ol className="process-steps reveal-stagger">
            <li className="process-step reveal">
              <h3 className="process-step-title">Postula por Discord</h3>
              <p className="process-step-text">Entra a nuestro servidor y preséntate en el canal de reclutamiento: personaje, clase y disponibilidad.</p>
            </li>
            <li className="process-step reveal">
              <h3 className="process-step-title">Conversemos</h3>
              <p className="process-step-text">Un oficial te va a contactar para conocerte un poco más y resolver dudas sobre el gremio.</p>
            </li>
            <li className="process-step reveal">
              <h3 className="process-step-title">Bienvenida</h3>
              <p className="process-step-text">Si encajas con el equipo, te sumamos oficialmente a Special Delivery. ¡A jugar!</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="section section-alt">
        <div className="section-inner">
          <div className="recruit-cta recruit-cta-centered reveal">
            <p className="recruit-cta-text">Las postulaciones se gestionan por Discord.</p>
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-discord btn-large">
              <DiscordIcon />
              <span>Postular por Discord</span>
              <span className="discord-online" data-discord-online hidden>
                <span className="discord-online-dot" aria-hidden="true"></span>
                <span className="discord-online-count" data-discord-online-count></span>
              </span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
