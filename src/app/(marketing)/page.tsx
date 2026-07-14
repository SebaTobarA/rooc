import Link from "next/link";
import { DiscordIcon } from "@/components/marketing/discord-icon";
import { prisma } from "@/lib/prisma";
import { discordAvatarUrl } from "@/lib/discord-avatar";

const DISCORD_INVITE_URL = "https://discord.gg/XnTrEKEGw";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  discord_not_member: "Esa cuenta de Discord no pertenece al server de Special Delivery. Únete primero desde el botón de Discord.",
  discord_invalid: "No se pudo completar el inicio de sesión con Discord. Intenta de nuevo.",
  discord_failed: "Hubo un error al conectar con Discord. Intenta de nuevo.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? LOGIN_ERROR_MESSAGES[params.error] : undefined;

  const leadershipPositions = await prisma.leadershipPosition.findMany({
    orderBy: { order: "asc" },
    include: { members: { orderBy: { order: "asc" } } },
  });

  return (
    <>
      {/* ============ INICIO / HERO ============ */}
      <section id="inicio" className="hero">
        <div className="hero-inner">
          {errorMessage && (
            <p className="login-error-banner reveal is-visible">{errorMessage}</p>
          )}
          <div className="hero-logo-wrap">
            <img
              src="/assets/mascota-fantasma-icono.svg"
              alt="Mascota fantasma de Special Delivery"
              className="hero-logo"
              width={180}
              height={180}
            />
          </div>
          <span className="eyebrow">Ragnarok Origin: Classic</span>
          <h1 className="hero-title">Special Delivery</h1>
          <p className="hero-tagline">Siendo competitivos desde el 2008</p>

          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-discord btn-large">
            <DiscordIcon />
            <span>Únete a nuestro Discord</span>
            <span className="discord-online" data-discord-online hidden>
              <span className="discord-online-dot" aria-hidden="true"></span>
              <span className="discord-online-count" data-discord-online-count></span>
            </span>
          </a>
        </div>
      </section>

      {/* ============ ACERCA DE LA GUILD ============ */}
      <section id="historia" className="section section-fullscreen section-particles-host watermark-host">
        <div className="particles" id="aboutParticles" aria-hidden="true"></div>

        <div className="watermark" aria-hidden="true"><span>Gremio</span></div>

        <div className="section-inner">
          <span className="eyebrow reveal">Desde 2008</span>
          <h2 className="section-title reveal">Acerca de la Guild</h2>
        </div>

        <div className="deck" id="aboutDeck">
          <div className="deck-sticky">
            <div className="deck-slide">
              <div className="section-inner">
                <div className="info-block">
                  <div className="info-block-title">
                    <h3 className="section-subtitle">Cómo nace Special Delivery</h3>
                    <span className="info-block-accent" aria-hidden="true"></span>
                  </div>
                  <div className="info-block-content">
                    <div className="info-card">
                      <p className="section-text">En el 2008 junto a nuestros amigos fundamos Special Delivery para jugar en Ragnarok Online, con el tiempo participamos en distintos servidores hasta que ahora hemos decidido participar en la versión de Ragnarok Online Origin Classic Americas.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="deck-slide">
              <div className="section-inner">
                <div className="info-block">
                  <div className="info-block-title" id="leadershipTitle">
                    <span className="eyebrow">Liderazgo</span>
                    <h3 className="section-subtitle">El mando no<br />se improvisa</h3>
                    <p className="section-text leadership-text">La cadena de mando, de arriba hacia abajo: quienes marcan el rumbo, sostienen el estándar y mantienen unido al gremio.</p>
                    <span className="info-block-accent" aria-hidden="true"></span>
                  </div>
                  <div className="info-block-content">
                    <div className="timeline watermark-host" id="leadershipTimeline">
                      <div className="watermark" aria-hidden="true"><span>Rangos</span></div>

                      <div className="timeline-line" aria-hidden="true">
                        <span className="timeline-line-fill" id="timelineFill"></span>
                      </div>

                      <ol className="timeline-list">
                        {leadershipPositions.map((position, index) => (
                          <li
                            key={position.id}
                            className={`timeline-step${index === 0 ? " timeline-step-lead" : ""}`}
                          >
                            <span className="timeline-node">
                              <span className="timeline-node-num">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </span>
                            <div className="timeline-content">
                              <p className="timeline-role">{position.title}</p>
                              <div className="org-people">
                                {position.members.map((member) => {
                                  const avatar = discordAvatarUrl(
                                    member.discordId,
                                    member.discordAvatarHash,
                                    52
                                  );
                                  return (
                                    <div key={member.id} className="org-person">
                                      {avatar ? (
                                        <img src={avatar} alt="" className="org-avatar" />
                                      ) : (
                                        <span className="org-avatar" aria-hidden="true">
                                          {member.nickname.slice(0, 1).toUpperCase()}
                                        </span>
                                      )}
                                      <span className="org-name">{member.nickname}</span>
                                    </div>
                                  );
                                })}
                                {position.members.length === 0 && (
                                  <div className="org-person">
                                    <span className="org-avatar" aria-hidden="true">?</span>
                                    <span className="org-name">Por definir</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ MIRA NUESTROS VIDEOS ============ */}
      <section id="videos" className="section section-halfscreen watermark-host">
        <div className="watermark" aria-hidden="true"><span>Contenido</span></div>

        <div className="section-inner">
          <span className="eyebrow eyebrow-center reveal">Actividad</span>
          <h3 className="videos-title reveal">Mira nuestros videos y síguenos en redes</h3>

          <div className="social-links reveal">
            <a href="https://www.youtube.com/@SpecialDeliveryRO" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="YouTube de Special Delivery">
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
              </svg>
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Twitch de Special Delivery">
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M4.3 2 2 7v13h5v2h3l2-2h4l4-4V2H4.3ZM18 15l-2 2h-4l-2 2v-2H6V4h12v11Z" />
                <path fill="currentColor" d="M15 7h2v5h-2zM10 7h2v5h-2z" />
              </svg>
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram de Special Delivery">
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M12 2c-2.7 0-3.05.01-4.12.06-1.06.05-1.79.22-2.43.47-.66.26-1.22.6-1.77 1.16-.56.55-.9 1.11-1.16 1.77-.25.64-.42 1.37-.47 2.43C2 8.95 2 9.3 2 12s.01 3.05.06 4.12c.05 1.06.22 1.79.47 2.43.26.66.6 1.22 1.16 1.77.55.56 1.11.9 1.77 1.16.64.25 1.37.42 2.43.47C8.95 22 9.3 22 12 22s3.05-.01 4.12-.06c1.06-.05 1.79-.22 2.43-.47.66-.26 1.22-.6 1.77-1.16.56-.55.9-1.11 1.16-1.77.25-.64.42-1.37.47-2.43.05-1.07.06-1.42.06-4.12s-.01-3.05-.06-4.12c-.05-1.06-.22-1.79-.47-2.43a4.9 4.9 0 0 0-1.16-1.77 4.9 4.9 0 0 0-1.77-1.16c-.64-.25-1.37-.42-2.43-.47C15.05 2 14.7 2 12 2Zm0 1.8c2.67 0 2.98.01 4.04.06.97.04 1.5.2 1.85.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.14.35.3.88.34 1.85.05 1.06.06 1.37.06 4.04s-.01 2.98-.06 4.04c-.04.97-.2 1.5-.34 1.85a3.1 3.1 0 0 1-.75 1.15c-.35.35-.68.57-1.15.75-.35.14-.88.3-1.85.34-1.06.05-1.37.06-4.04.06s-2.98-.01-4.04-.06c-.97-.04-1.5-.2-1.85-.34a3.1 3.1 0 0 1-1.15-.75 3.1 3.1 0 0 1-.75-1.15c-.14-.35-.3-.88-.34-1.85C3.81 14.98 3.8 14.67 3.8 12s.01-2.98.06-4.04c.04-.97.2-1.5.34-1.85.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.35-.14.88-.3 1.85-.34C9.02 3.81 9.33 3.8 12 3.8Zm0 3.2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.2-8.4a1.17 1.17 0 1 1-2.34 0 1.17 1.17 0 0 1 2.34 0Z" />
              </svg>
            </a>
          </div>

          <div className="carousel reveal" id="videoCarousel" aria-roledescription="carrusel" aria-label="Videos de la guild">
            <div className="carousel-track" id="carouselTrack"></div>

            <div className="carousel-controls">
              <div className="carousel-progress">
                <div className="carousel-progress-bar" id="carouselProgressBar"></div>
              </div>
              <div className="carousel-arrows">
                <button className="carousel-arrow" id="carouselPrev" aria-label="Video anterior">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                </button>
                <button className="carousel-arrow" id="carouselNext" aria-label="Video siguiente">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ RECLUTAMIENTO (teaser) ============ */}
      <section id="reclutamiento" className="section section-alt section-fullscreen reclutamiento-teaser">
        <div className="ghost-watermark-wrap" aria-hidden="true">
          <img src="/assets/mascota-fantasma-icono.svg" alt="" className="ghost-watermark" />
        </div>

        <div className="section-inner join-teaser">
          <span className="eyebrow reveal">Únete a Special Delivery</span>
          <h2 className="section-title join-teaser-title reveal">Crezcamos Juntos</h2>
          <p className="join-teaser-text reveal">Creemos que la forma de llegar al TOP es jugando juntos.</p>
          <Link href="/reclutamiento" className="btn btn-discord btn-large reveal">
            <span>Únete a Special</span>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
