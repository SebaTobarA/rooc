/* =========================================================
   Special Delivery — script.js
   JS vanilla, sin dependencias. Responsabilidades:
   1) Menú de navegación móvil
   2) Carrusel de videos (flechas, dots, swipe táctil, autoplay)
   3) Facade de YouTube: solo crea el <iframe> al hacer click
   4) Header que gana sombra al hacer scroll
   5) Scroll-reveal de secciones (IntersectionObserver)
   6) Contador de miembros conectados en Discord (API pública de invitaciones)
   7) Partículas de fondo decorativas en "Acerca de la Guild"
   8) Presentación de 2 láminas con crossfade en "Acerca de la Guild"
   ========================================================= */

(function () {
  'use strict';

  // Se respeta en todo el archivo: sin animaciones de movimiento continuo
  // (autoplay del carrusel, etc.) para quien prefiere menos motion.
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1) Menú móvil ---------- */
  var navToggle = document.getElementById('navToggle');
  var primaryNav = document.getElementById('primaryNav');

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = primaryNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Cierra el menú al elegir un link (mejora la navegación en mobile)
    primaryNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        primaryNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- 2) Carrusel de videos ---------- */
  // Lista editable de videos (máximo 10, se muestran varios a la vez con
  // scroll horizontal). Para sumar uno nuevo, agrega un objeto con el ID del
  // video de YouTube (lo que va después de "v=" en la URL), el título, el
  // nombre del canal y la fecha de publicación ("AAAA-MM-DD"). Orden manual,
  // de más nuevo a más viejo.
  var VIDEOS = [
    { videoId: 'brGU04nxOlA', title: '¡APROVECHA ESTAS 3 PROMOCIONES ANTES DEL LANZAMIENTO! | Ragnarok Origin Classic AM', channel: 'Special Delivery - Ragnarok Online', date: '2026-07-09' },
    { videoId: '1d5Z8felm1s', title: 'Guía Completa de PORING JOURNAL al 100% | Guía Ragnarok Origin Classic', channel: 'Styan', date: '2026-07-05' },
    { videoId: 'q9LD6LHapbw', title: '¡TODAS las CLASES CONFIRMADAS para Ragnarok Origin Classic AM! ¿Cuál elegirás el 23 de julio?', channel: 'Special Delivery - Ragnarok Online', date: '2026-06-30' },
    { videoId: 'mZZwp0vrMEg', title: 'Guía Completa de Funfair Isle | Ragnarok Origin Classic', channel: 'Styan', date: '2026-06-30' },
    { videoId: 'hMIQZUIb5wk', title: '¡Ragnarok Origin Classic AM YA TIENE FECHA! ¿Ahora SÍ será Free to Play? | Todo lo que debes saber', channel: 'Special Delivery - Ragnarok Online', date: '2026-06-29' }
  ].slice(0, 10);

  var MONTH_NAMES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function formatVideoDate(yyyyMmDd) {
    var parts = yyyyMmDd.split('-');
    var monthName = MONTH_NAMES_ES[parseInt(parts[1], 10) - 1] || '';
    return monthName + ' ' + parseInt(parts[2], 10);
  }

  var PLAY_ICON_SVG = '<svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7c-.8-3-2.9-5.3-5.7-6.1C55.8 0 34 0 34 0S12.2 0 7.2 1.6C4.4 2.4 2.3 4.7 1.5 7.7 0 13 0 24 0 24s0 11 1.5 16.3c.8 3 2.9 5.3 5.7 6.1C12.2 48 34 48 34 48s21.8 0 26.8-1.6c2.8-.8 4.9-3.1 5.7-6.1C68 35 68 24 68 24s0-11-1.5-16.3z" fill="#4dd8e8" opacity="0.9"/><path d="M45 24 27 14v20z" fill="#0a0a0d"/></svg>';
  var CALENDAR_ICON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 6v11H5V8h14Z"/></svg>';

  var track = document.getElementById('carouselTrack');
  var prevBtn = document.getElementById('carouselPrev');
  var nextBtn = document.getElementById('carouselNext');
  var progressBar = document.getElementById('carouselProgressBar');

  if (track && prevBtn && nextBtn && progressBar && VIDEOS.length) {
    // Arma cada slide: miniatura (facade lazy-load) + título + canal + fecha
    VIDEOS.forEach(function (video) {
      var slide = document.createElement('div');
      slide.className = 'carousel-slide';

      var facade = document.createElement('div');
      facade.className = 'yt-facade';
      facade.setAttribute('data-video-id', video.videoId);
      facade.setAttribute('role', 'button');
      facade.setAttribute('tabindex', '0');
      facade.setAttribute('aria-label', 'Reproducir video: ' + video.title);
      facade.innerHTML =
        '<img class="yt-thumb" src="https://i.ytimg.com/vi/' + encodeURIComponent(video.videoId) + '/hqdefault.jpg" ' +
        'alt="Miniatura: ' + video.title + '" loading="lazy">' +
        '<span class="yt-play" aria-hidden="true">' + PLAY_ICON_SVG + '</span>';

      var meta = document.createElement('div');
      meta.className = 'yt-meta';
      meta.innerHTML =
        '<p class="yt-title"></p>' +
        '<div class="yt-meta-row">' +
        '<span class="yt-channel"></span>' +
        '<span class="yt-date">' + CALENDAR_ICON_SVG + '<span></span></span>' +
        '</div>';
      meta.querySelector('.yt-title').textContent = video.title;
      meta.querySelector('.yt-channel').textContent = video.channel;
      meta.querySelector('.yt-date span').textContent = formatVideoDate(video.date);

      slide.appendChild(facade);
      slide.appendChild(meta);
      track.appendChild(slide);
    });

    var slides = Array.prototype.slice.call(track.children);
    var offset = 0; // px ya scrolleados dentro del track

    // Distancia entre el inicio de una tarjeta y la siguiente (ancho + gap),
    // medida directamente del layout real en vez de asumir un valor fijo,
    // así se adapta solo a cualquier ancho de pantalla.
    function getStep() {
      if (slides.length < 2) return slides.length ? slides[0].getBoundingClientRect().width : 0;
      return slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().left;
    }

    // Cuánto se puede scrollear como máximo sin dejar espacio vacío al final
    function getMaxOffset() {
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    function update() {
      var max = getMaxOffset();
      offset = Math.max(0, Math.min(max, offset));
      track.style.transform = 'translateX(-' + offset + 'px)';
      progressBar.style.width = (max > 0 ? (offset / max) * 100 : 0) + '%';
    }

    function goTo(newOffset) {
      offset = newOffset;
      update();
    }

    prevBtn.addEventListener('click', function () {
      goTo(offset - getStep());
    });

    nextBtn.addEventListener('click', function () {
      goTo(offset + getStep());
    });

    // El track necesita transición para el translateX
    track.style.transition = 'transform 0.3s ease';
    track.style.willChange = 'transform';

    // Swipe táctil (mobile)
    var touchStartX = 0;
    var touchDeltaX = 0;

    track.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchDeltaX = 0;
    }, { passive: true });

    track.addEventListener('touchmove', function (e) {
      touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive: true });

    track.addEventListener('touchend', function () {
      var SWIPE_THRESHOLD = 40;
      if (touchDeltaX > SWIPE_THRESHOLD) {
        goTo(offset - getStep());
      } else if (touchDeltaX < -SWIPE_THRESHOLD) {
        goTo(offset + getStep());
      }
    });

    window.addEventListener('resize', update);
    update();

    // Autoplay suave: avanza solo, se pausa con hover/foco/touch y se
    // detiene para siempre apenas se carga un video real (ver sección 3).
    // Al llegar al final vuelve al principio.
    var AUTOPLAY_MS = 4500;
    var autoplayTimer = null;

    function startAutoplay() {
      if (prefersReducedMotion || autoplayTimer || slides.length < 2) return;
      autoplayTimer = window.setInterval(function () {
        var max = getMaxOffset();
        goTo(offset >= max ? 0 : offset + getStep());
      }, AUTOPLAY_MS);
    }

    function stopAutoplay() {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }

    var carouselEl = document.getElementById('videoCarousel');
    carouselEl.addEventListener('pointerenter', stopAutoplay);
    carouselEl.addEventListener('pointerleave', startAutoplay);
    carouselEl.addEventListener('focusin', stopAutoplay);
    carouselEl.addEventListener('focusout', startAutoplay);
    carouselEl.addEventListener('touchstart', stopAutoplay, { passive: true });

    startAutoplay();

    // La sección 3 llama a esto al reproducir un video para no seguir avanzando encima
    var stopCarouselAutoplay = stopAutoplay;
  }

  /* ---------- 3) Facade de YouTube (lazy-load real) ---------- */
  // No se inserta ningún <iframe> hasta que el usuario hace click,
  // así el carrusel no carga varios reproductores de YouTube de entrada.
  function loadYouTubeVideo(facade) {
    var videoId = facade.getAttribute('data-video-id');
    if (!videoId) return;

    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1';
    iframe.title = 'Video de Special Delivery';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';

    facade.replaceWith(iframe);
  }

  document.querySelectorAll('.yt-facade').forEach(function (facade) {
    facade.addEventListener('click', function () {
      loadYouTubeVideo(facade);
      if (typeof stopCarouselAutoplay === 'function') stopCarouselAutoplay();
    });

    // Accesible por teclado (Enter / Espacio) ya que es un elemento con role="button"
    facade.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        loadYouTubeVideo(facade);
        if (typeof stopCarouselAutoplay === 'function') stopCarouselAutoplay();
      }
    });
  });

  /* ---------- 4) Header con sombra al hacer scroll ---------- */
  var siteHeader = document.querySelector('.site-header');

  if (siteHeader) {
    function updateHeaderState() {
      siteHeader.classList.toggle('is-scrolled', window.scrollY > 8);
    }

    // Directo en el 'scroll', sin encolar con requestAnimationFrame (ver
    // nota en la sección 8 sobre por qué eso puede no ser confiable).
    window.addEventListener('scroll', updateHeaderState, { passive: true });
    updateHeaderState();
  }

  /* ---------- 5) Scroll-reveal con IntersectionObserver ---------- */
  // .reveal: se revela una vez al entrar en viewport y queda así para siempre.
  var revealEls = document.querySelectorAll('.reveal');

  if (revealEls.length && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Sin soporte de IntersectionObserver: mostrar todo directamente
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // .reveal-scroll: variante reversible usada en "Acerca de la Guild" — se
  // muestra al entrar en el viewport y se vuelve a ocultar al salir (subir
  // de nuevo hacia el Hero), sin scroll-jacking ni botones: navegación 100%
  // con el scroll normal de la página.
  var revealScrollEls = document.querySelectorAll('.reveal-scroll');

  if (revealScrollEls.length && 'IntersectionObserver' in window) {
    if (prefersReducedMotion) {
      revealScrollEls.forEach(function (el) {
        el.classList.add('is-visible');
      });
    } else {
      var revealScrollObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

      revealScrollEls.forEach(function (el) {
        revealScrollObserver.observe(el);
      });
    }
  } else {
    revealScrollEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ---------- 6) Conectados en Discord ---------- */
  // Usa la API pública de invitaciones de Discord (sin autenticación, sin
  // necesidad de habilitar el widget del server). Si falla o el servidor
  // bloquea la petición, el badge queda oculto y el botón sigue funcionando
  // como un link normal a Discord.
  var DISCORD_INVITE_CODE = 'XnTrEKEGw';
  var DISCORD_REFRESH_MS = 60000;

  function updateDiscordOnlineCount() {
    fetch('https://discord.com/api/v10/invites/' + DISCORD_INVITE_CODE + '?with_counts=true')
      .then(function (res) {
        if (!res.ok) throw new Error('Discord invite request failed');
        return res.json();
      })
      .then(function (data) {
        var online = data.approximate_presence_count;
        if (typeof online !== 'number') return;

        // Visualmente solo se muestra el número (el punto verde ya indica "en línea"),
        // pero se deja un aria-label con la frase completa para lectores de pantalla.
        document.querySelectorAll('[data-discord-online-count]').forEach(function (el) {
          el.textContent = String(online);
        });
        document.querySelectorAll('[data-discord-online]').forEach(function (el) {
          el.hidden = false;
          el.setAttribute('aria-label', online + (online === 1 ? ' conectado' : ' conectados'));
        });
      })
      .catch(function () {
        // Silencioso a propósito: sin conteo, el botón es un link normal.
      });
  }

  updateDiscordOnlineCount();
  window.setInterval(updateDiscordOnlineCount, DISCORD_REFRESH_MS);

  /* ---------- 7) Partículas de fondo decorativas ---------- */
  // Puramente visuales (aria-hidden en el HTML). Se generan una sola vez con
  // posiciones/tamaños/tiempos aleatorios y luego animan solo con CSS (sin
  // costo de JS continuo). Se omiten directamente con prefers-reduced-motion.
  var particlesContainer = document.getElementById('aboutParticles');

  if (particlesContainer && !prefersReducedMotion) {
    var PARTICLE_COUNT = 26;

    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var particle = document.createElement('span');
      var size = 2 + Math.random() * 3;
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.opacity = String(0.15 + Math.random() * 0.35);
      particle.style.animationDuration = (4 + Math.random() * 5) + 's';
      particle.style.animationDelay = (Math.random() * 6) + 's';
      if (i % 3 === 0) {
        particle.style.background = 'var(--color-secondary)';
      }
      particlesContainer.appendChild(particle);
    }
  }

  /* ---------- 8) Presentación de 2 láminas con crossfade ---------- */
  // Por defecto (sin JS, o con prefers-reduced-motion) las 2 láminas ya se
  // ven apiladas y 100% legibles (ver CSS). Solo si hay soporte y sin
  // "menos movimiento" se fija el área (.deck-sticky, con 100dvh — no
  // 100vh, para no saltar cuando la barra de direcciones de iOS
  // aparece/desaparece al scrollear) y se cruzan en fundido según el
  // progreso del scroll dentro de .deck.
  var deck = document.getElementById('aboutDeck');

  if (deck && !prefersReducedMotion) {
    var deckSlides = Array.prototype.slice.call(deck.querySelectorAll('.deck-slide'));

    // Timeline de liderazgo (lámina 2): la línea y el "encendido" de cada
    // rango se dibujan en vivo con el mismo progreso de scroll que mueve el
    // crossfade, en vez de aparecer todos juntos con un delay fijo.
    var timelineFill = document.getElementById('timelineFill');
    var timelineSteps = Array.prototype.slice.call(document.querySelectorAll('#leadershipTimeline .timeline-step'));

    if (deckSlides.length > 1) {
      deck.classList.add('deck-enabled');

      function updateDeck() {
        var rect = deck.getBoundingClientRect();
        var scrollable = deck.offsetHeight - window.innerHeight;
        var progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
        progress = Math.max(0, Math.min(1, progress));

        // La transición (fundido cruzado) ocurre en un tramo más ancho que
        // antes (35%–70% del recorrido en vez de 40%–60%) para dejarle más
        // "metros" de scroll a la timeline de liderazgo y que se sienta
        // ligada a la rueda del mouse en vez de instantánea.
        var fade = (progress - 0.35) / 0.35;
        fade = Math.max(0, Math.min(1, fade));

        deckSlides[0].style.opacity = String(1 - fade);
        deckSlides[1].style.opacity = String(fade);
        deckSlides[0].setAttribute('aria-hidden', fade > 0.5 ? 'true' : 'false');
        deckSlides[1].setAttribute('aria-hidden', fade <= 0.5 ? 'true' : 'false');

        // La línea de la timeline crece con el mismo "fade": a mitad de
        // camino del crossfade, la línea está a mitad de dibujarse.
        if (timelineFill) {
          timelineFill.style.transform = 'scaleY(' + fade + ')';
        }

        // Cada rango se "enciende" cuando el progreso alcanza su umbral,
        // repartidos en partes iguales a lo largo del mismo "fade".
        if (timelineSteps.length) {
          timelineSteps.forEach(function (step, index) {
            var threshold = (index + 1) / timelineSteps.length;
            step.classList.toggle('is-lit', fade >= threshold - 0.001);
          });
        }
      }

      // Se llama directo en el 'scroll' en vez de encolar con
      // requestAnimationFrame: rAF puede quedar sin dispararse de forma
      // confiable en algunos navegadores/situaciones, dejando el crossfade
      // "pegado" en el estado inicial durante todo el scroll. La función es
      // liviana (solo escribe unos estilos), así que llamarla en cada
      // evento de scroll no tiene costo real de performance.
      window.addEventListener('scroll', updateDeck, { passive: true });
      window.addEventListener('resize', updateDeck);
      updateDeck();
    }
  }

})();
