import type { Metadata } from "next";
import Link from "next/link";
import { DiscordIcon } from "@/components/marketing/discord-icon";
import { APPLICATION_SCREENSHOTS } from "@/lib/recruitment-screenshots";

const DISCORD_INVITE_URL = "https://discord.gg/XnTrEKEGw";
const APPLICATION_FORM_PATH = "/panel/postulacion";

export const metadata: Metadata = {
  title: "Reclutamiento",
  description:
    "Reclutamiento de Special Delivery: gremio de Ragnarok Online Origin Classic. Conoce qué buscamos, los requisitos y cómo postular.",
};

/** Ícono de documento, para diferenciar el CTA del formulario del de Discord. */
function FormIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9zM8 13h8v2H8zm0 4h8v2H8zm0-8h3v2H8z"
      />
    </svg>
  );
}

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
        {/* El formulario es la vía principal; Discord queda como alternativa */}
        <div className="hero-actions">
          <Link href={APPLICATION_FORM_PATH} className="btn btn-discord btn-large">
            <FormIcon />
            <span>Completar postulación</span>
          </Link>

          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-large">
            <DiscordIcon />
            <span>Hablar por Discord</span>
            <span className="discord-online" data-discord-online hidden>
              <span className="discord-online-dot" aria-hidden="true"></span>
              <span className="discord-online-count" data-discord-online-count></span>
            </span>
          </a>
        </div>
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
              <h3 className="process-step-title">Completa el formulario</h3>
              <p className="process-step-text">Inicias sesión con Discord y llenas la postulación: personaje, clase, nivel, disponibilidad y las capturas de tu progreso.</p>
            </li>
            <li className="process-step reveal">
              <h3 className="process-step-title">Conversemos</h3>
              <p className="process-step-text">Un oficial revisa tu postulación y te contacta por Discord para conocerte un poco más y resolver dudas sobre el gremio.</p>
            </li>
            <li className="process-step reveal">
              <h3 className="process-step-title">Bienvenida</h3>
              <p className="process-step-text">Si encajas con el equipo, te sumamos oficialmente a Special Delivery. ¡A jugar!</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ============ POSTULACIÓN ============ */}
      <section className="section section-alt watermark-host" id="postular">
        <div className="watermark" aria-hidden="true"><span>Postular</span></div>
        <div className="section-inner">
          <span className="eyebrow reveal">Último paso</span>
          <h2 className="section-subtitle reveal">Envía tu postulación</h2>
          <p className="section-text reveal">Inicias sesión con Discord, completas el formulario y un oficial lo revisa.</p>

          <div className="apply-card reveal">
            <div className="apply-cta">
              <p className="apply-cta-text">
                Antes de empezar, ten a mano el juego: te vamos a pedir{" "}
                <strong>{APPLICATION_SCREENSHOTS.length} capturas</strong> de tu progreso.
              </p>

              <ul className="apply-checklist">
                {APPLICATION_SCREENSHOTS.map((shot) => (
                  <li key={shot.field}>{shot.label}</li>
                ))}
              </ul>

              <Link href={APPLICATION_FORM_PATH} className="btn btn-discord btn-large">
                <FormIcon />
                <span>Ir al formulario</span>
              </Link>

              <p className="apply-legal">
                Necesitas iniciar sesión con Discord y ser parte de nuestro servidor. Solo
                compartimos estos datos con el liderazgo del gremio.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
