"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Video = {
  videoId: string;
  title: string;
  channel: string;
  date: string;
};

const VIDEOS: Video[] = [
  { videoId: "brGU04nxOlA", title: "¡APROVECHA ESTAS 3 PROMOCIONES ANTES DEL LANZAMIENTO! | Ragnarok Origin Classic AM", channel: "Special Delivery - Ragnarok Online", date: "2026-07-09" },
  { videoId: "1d5Z8felm1s", title: "Guía Completa de PORING JOURNAL al 100% | Guía Ragnarok Origin Classic", channel: "Styan", date: "2026-07-05" },
  { videoId: "q9LD6LHapbw", title: "¡TODAS las CLASES CONFIRMADAS para Ragnarok Origin Classic AM! ¿Cuál elegirás el 23 de julio?", channel: "Special Delivery - Ragnarok Online", date: "2026-06-30" },
  { videoId: "mZZwp0vrMEg", title: "Guía Completa de Funfair Isle | Ragnarok Origin Classic", channel: "Styan", date: "2026-06-30" },
  { videoId: "hMIQZUIb5wk", title: "¡Ragnarok Origin Classic AM YA TIENE FECHA! ¿Ahora SÍ será Free to Play? | Todo lo que debes saber", channel: "Special Delivery - Ragnarok Online", date: "2026-06-29" },
].slice(0, 10);

const MONTH_NAMES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatVideoDate(yyyyMmDd: string): string {
  const parts = yyyyMmDd.split("-");
  const monthName = MONTH_NAMES_ES[parseInt(parts[1], 10) - 1] || "";
  return `${monthName} ${parseInt(parts[2], 10)}`;
}

const PLAY_ICON_SVG =
  '<svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7c-.8-3-2.9-5.3-5.7-6.1C55.8 0 34 0 34 0S12.2 0 7.2 1.6C4.4 2.4 2.3 4.7 1.5 7.7 0 13 0 24 0 24s0 11 1.5 16.3c.8 3 2.9 5.3 5.7 6.1C12.2 48 34 48 34 48s21.8 0 26.8-1.6c2.8-.8 4.9-3.1 5.7-6.1C68 35 68 24 68 24s0-11-1.5-16.3z" fill="#4dd8e8" opacity="0.9"/><path d="M45 24 27 14v20z" fill="#0a0a0d"/></svg>';
const CALENDAR_ICON_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 6v11H5V8h14Z"/></svg>';

const DISCORD_INVITE_CODE = "XnTrEKEGw";
const DISCORD_REFRESH_MS = 60000;

/**
 * Reimplementación en React de script.js (menú móvil, carrusel de videos,
 * facade de YouTube, header con sombra, scroll-reveal, contador de Discord,
 * partículas y crossfade de "Acerca de la Guild"). Corre una sola vez al
 * montar, apuntando a los mismos ids/clases que ya renderiza el HTML del
 * layout/página de marketing.
 */
export function MarketingScripts() {
  const pathname = usePathname();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    // 1) Menú móvil
    const navToggle = document.getElementById("navToggle");
    const primaryNav = document.getElementById("primaryNav");

    if (navToggle && primaryNav) {
      const onToggleClick = () => {
        const isOpen = primaryNav.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      };
      navToggle.addEventListener("click", onToggleClick);
      cleanups.push(() => navToggle.removeEventListener("click", onToggleClick));

      const links = Array.from(primaryNav.querySelectorAll("a"));
      const onLinkClick = () => {
        primaryNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      };
      links.forEach((link) => link.addEventListener("click", onLinkClick));
      cleanups.push(() => links.forEach((link) => link.removeEventListener("click", onLinkClick)));
    }

    // 2) Carrusel de videos
    const track = document.getElementById("carouselTrack");
    const prevBtn = document.getElementById("carouselPrev");
    const nextBtn = document.getElementById("carouselNext");
    const progressBar = document.getElementById("carouselProgressBar");

    let stopCarouselAutoplay: (() => void) | undefined;

    if (track && prevBtn && nextBtn && progressBar && VIDEOS.length && track.children.length === 0) {
      VIDEOS.forEach((video) => {
        const slide = document.createElement("div");
        slide.className = "carousel-slide";

        const facade = document.createElement("div");
        facade.className = "yt-facade";
        facade.setAttribute("data-video-id", video.videoId);
        facade.setAttribute("role", "button");
        facade.setAttribute("tabindex", "0");
        facade.setAttribute("aria-label", `Reproducir video: ${video.title}`);
        facade.innerHTML =
          `<img class="yt-thumb" src="https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg" ` +
          `alt="Miniatura: ${video.title}" loading="lazy">` +
          `<span class="yt-play" aria-hidden="true">${PLAY_ICON_SVG}</span>`;

        const meta = document.createElement("div");
        meta.className = "yt-meta";
        meta.innerHTML =
          '<p class="yt-title"></p>' +
          '<div class="yt-meta-row">' +
          '<span class="yt-channel"></span>' +
          `<span class="yt-date">${CALENDAR_ICON_SVG}<span></span></span>` +
          "</div>";
        (meta.querySelector(".yt-title") as HTMLElement).textContent = video.title;
        (meta.querySelector(".yt-channel") as HTMLElement).textContent = video.channel;
        (meta.querySelector(".yt-date span") as HTMLElement).textContent = formatVideoDate(video.date);

        slide.appendChild(facade);
        slide.appendChild(meta);
        track.appendChild(slide);
      });

      const slides = Array.from(track.children) as HTMLElement[];
      let offset = 0;

      const getStep = () => {
        if (slides.length < 2) return slides.length ? slides[0].getBoundingClientRect().width : 0;
        return slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().left;
      };

      const getMaxOffset = () => Math.max(0, track.scrollWidth - track.clientWidth);

      const update = () => {
        const max = getMaxOffset();
        offset = Math.max(0, Math.min(max, offset));
        track.style.transform = `translateX(-${offset}px)`;
        (progressBar as HTMLElement).style.width = `${max > 0 ? (offset / max) * 100 : 0}%`;
      };

      const goTo = (newOffset: number) => {
        offset = newOffset;
        update();
      };

      const onPrev = () => goTo(offset - getStep());
      const onNext = () => goTo(offset + getStep());
      prevBtn.addEventListener("click", onPrev);
      nextBtn.addEventListener("click", onNext);
      cleanups.push(() => {
        prevBtn.removeEventListener("click", onPrev);
        nextBtn.removeEventListener("click", onNext);
      });

      track.style.transition = "transform 0.3s ease";
      track.style.willChange = "transform";

      let touchStartX = 0;
      let touchDeltaX = 0;

      const onTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchDeltaX = 0;
      };
      const onTouchMove = (e: TouchEvent) => {
        touchDeltaX = e.touches[0].clientX - touchStartX;
      };
      const onTouchEnd = () => {
        const SWIPE_THRESHOLD = 40;
        if (touchDeltaX > SWIPE_THRESHOLD) goTo(offset - getStep());
        else if (touchDeltaX < -SWIPE_THRESHOLD) goTo(offset + getStep());
      };
      track.addEventListener("touchstart", onTouchStart, { passive: true });
      track.addEventListener("touchmove", onTouchMove, { passive: true });
      track.addEventListener("touchend", onTouchEnd);
      cleanups.push(() => {
        track.removeEventListener("touchstart", onTouchStart);
        track.removeEventListener("touchmove", onTouchMove);
        track.removeEventListener("touchend", onTouchEnd);
      });

      window.addEventListener("resize", update);
      cleanups.push(() => window.removeEventListener("resize", update));
      update();

      const AUTOPLAY_MS = 4500;
      let autoplayTimer: number | null = null;

      const startAutoplay = () => {
        if (prefersReducedMotion || autoplayTimer || slides.length < 2) return;
        autoplayTimer = window.setInterval(() => {
          const max = getMaxOffset();
          goTo(offset >= max ? 0 : offset + getStep());
        }, AUTOPLAY_MS);
      };

      const stopAutoplay = () => {
        if (autoplayTimer) window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      };
      stopCarouselAutoplay = stopAutoplay;

      const carouselEl = document.getElementById("videoCarousel");
      if (carouselEl) {
        carouselEl.addEventListener("pointerenter", stopAutoplay);
        carouselEl.addEventListener("pointerleave", startAutoplay);
        carouselEl.addEventListener("focusin", stopAutoplay);
        carouselEl.addEventListener("focusout", startAutoplay);
        carouselEl.addEventListener("touchstart", stopAutoplay, { passive: true });
        cleanups.push(() => {
          carouselEl.removeEventListener("pointerenter", stopAutoplay);
          carouselEl.removeEventListener("pointerleave", startAutoplay);
          carouselEl.removeEventListener("focusin", stopAutoplay);
          carouselEl.removeEventListener("focusout", startAutoplay);
          carouselEl.removeEventListener("touchstart", stopAutoplay);
        });
      }

      startAutoplay();
      cleanups.push(stopAutoplay);
    }

    // 3) Facade de YouTube (lazy-load real)
    function loadYouTubeVideo(facade: Element) {
      const videoId = facade.getAttribute("data-video-id");
      if (!videoId) return;

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1`;
      iframe.title = "Video de Special Delivery";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.loading = "lazy";

      facade.replaceWith(iframe);
    }

    const facadeClickHandlers: Array<[Element, (e: Event) => void, (e: KeyboardEvent) => void]> = [];
    document.querySelectorAll(".yt-facade").forEach((facade) => {
      const onClick = () => {
        loadYouTubeVideo(facade);
        stopCarouselAutoplay?.();
      };
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          loadYouTubeVideo(facade);
          stopCarouselAutoplay?.();
        }
      };
      facade.addEventListener("click", onClick);
      facade.addEventListener("keydown", onKeydown as EventListener);
      facadeClickHandlers.push([facade, onClick, onKeydown]);
    });
    cleanups.push(() => {
      facadeClickHandlers.forEach(([facade, onClick, onKeydown]) => {
        facade.removeEventListener("click", onClick);
        facade.removeEventListener("keydown", onKeydown as EventListener);
      });
    });

    // 4) Header con sombra al hacer scroll
    const siteHeader = document.querySelector(".site-header");
    if (siteHeader) {
      const updateHeaderState = () => {
        siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      window.addEventListener("scroll", updateHeaderState, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", updateHeaderState));
      updateHeaderState();
    }

    // 5) Scroll-reveal con IntersectionObserver
    const revealEls = document.querySelectorAll(".reveal");
    if (revealEls.length && "IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach((el) => revealObserver.observe(el));
      cleanups.push(() => revealObserver.disconnect());
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    const revealScrollEls = document.querySelectorAll(".reveal-scroll");
    if (revealScrollEls.length && "IntersectionObserver" in window) {
      if (prefersReducedMotion) {
        revealScrollEls.forEach((el) => el.classList.add("is-visible"));
      } else {
        const revealScrollObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              entry.target.classList.toggle("is-visible", entry.isIntersecting);
            });
          },
          { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
        );
        revealScrollEls.forEach((el) => revealScrollObserver.observe(el));
        cleanups.push(() => revealScrollObserver.disconnect());
      }
    } else {
      revealScrollEls.forEach((el) => el.classList.add("is-visible"));
    }

    // 6) Conectados en Discord
    function updateDiscordOnlineCount() {
      fetch(`https://discord.com/api/v10/invites/${DISCORD_INVITE_CODE}?with_counts=true`)
        .then((res) => {
          if (!res.ok) throw new Error("Discord invite request failed");
          return res.json();
        })
        .then((data) => {
          const online = data.approximate_presence_count;
          if (typeof online !== "number") return;

          document.querySelectorAll("[data-discord-online-count]").forEach((el) => {
            el.textContent = String(online);
          });
          document.querySelectorAll("[data-discord-online]").forEach((el) => {
            (el as HTMLElement).hidden = false;
            el.setAttribute("aria-label", `${online}${online === 1 ? " conectado" : " conectados"}`);
          });
        })
        .catch(() => {
          // Silencioso a propósito: sin conteo, el botón sigue siendo un link normal.
        });
    }

    updateDiscordOnlineCount();
    const discordInterval = window.setInterval(updateDiscordOnlineCount, DISCORD_REFRESH_MS);
    cleanups.push(() => window.clearInterval(discordInterval));

    // 7) Partículas de fondo decorativas
    const particlesContainer = document.getElementById("aboutParticles");
    if (particlesContainer && !prefersReducedMotion && particlesContainer.children.length === 0) {
      const PARTICLE_COUNT = 26;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const particle = document.createElement("span");
        const size = 2 + Math.random() * 3;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.opacity = String(0.15 + Math.random() * 0.35);
        particle.style.animationDuration = `${4 + Math.random() * 5}s`;
        particle.style.animationDelay = `${Math.random() * 6}s`;
        if (i % 3 === 0) particle.style.background = "var(--color-secondary)";
        particlesContainer.appendChild(particle);
      }
    }

    // 8) Presentación de 2 láminas con crossfade
    const deck = document.getElementById("aboutDeck");
    if (deck && !prefersReducedMotion) {
      const deckSlides = Array.from(deck.querySelectorAll(".deck-slide")) as HTMLElement[];
      const timelineFill = document.getElementById("timelineFill");
      const leadershipTitle = document.getElementById("leadershipTitle");
      const timelineSteps = Array.from(
        document.querySelectorAll("#leadershipTimeline .timeline-step")
      ) as HTMLElement[];

      if (deckSlides.length > 1) {
        deck.classList.add("deck-enabled");

        const updateDeck = () => {
          const rect = deck.getBoundingClientRect();
          const scrollable = deck.offsetHeight - window.innerHeight;
          let progress = scrollable > 0 ? -rect.top / scrollable : 0;
          progress = Math.max(0, Math.min(1, progress));

          let fade = (progress - 0.35) / 0.35;
          fade = Math.max(0, Math.min(1, fade));

          deckSlides[0].style.opacity = String(1 - fade);
          deckSlides[1].style.opacity = String(fade);
          deckSlides[0].setAttribute("aria-hidden", fade > 0.5 ? "true" : "false");
          deckSlides[1].setAttribute("aria-hidden", fade <= 0.5 ? "true" : "false");

          if (timelineFill) {
            timelineFill.style.transform = `scaleY(${fade})`;
          }

          // El título entra primero (antes que el rango 01), con un umbral
          // más bajo que el del primer paso, para que la secuencia se sienta
          // título -> rango 1 -> rango 2 -> ... en vez de todo junto.
          if (leadershipTitle) {
            leadershipTitle.classList.toggle("title-visible", fade >= 0.08);
          }

          if (timelineSteps.length) {
            timelineSteps.forEach((step, index) => {
              const threshold = 0.18 + (index / timelineSteps.length) * 0.82;
              step.classList.toggle("is-lit", fade >= threshold - 0.001);
            });
          }
        };

        window.addEventListener("scroll", updateDeck, { passive: true });
        window.addEventListener("resize", updateDeck);
        cleanups.push(() => {
          window.removeEventListener("scroll", updateDeck);
          window.removeEventListener("resize", updateDeck);
        });
        updateDeck();
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
    // Se vuelve a ejecutar en cada cambio de ruta: MarketingLayout persiste
    // entre `/` y `/reclutamiento` (comparten el mismo layout), así que sin
    // esta dependencia el scroll-reveal y el resto de la inicialización solo
    // corren una vez y el contenido de la página a la que se navega con el
    // link queda invisible hasta que se hace un refresh completo.
  }, [pathname]);

  return null;
}
