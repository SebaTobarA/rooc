# Special Delivery — Sitio web de la guild (ROOC)

Sitio estático de una sola página (HTML + CSS + JS vanilla, sin frameworks ni build step).

## Estructura

```
/
├── index.html
├── styles.css
├── script.js
├── assets/
│   └── mascota-fantasma-icono.svg   (logo + favicon — reemplazar por el arte final)
└── README.md
```

## Previsualizar en local

No requiere instalación ni build. Alcanza con abrir `index.html` en el navegador,
pero para que el `fetch`/rutas relativas y el favicon se comporten igual que en
producción, es mejor servirlo con un servidor local simple:

```bash
# Opción 1: Python (viene preinstalado en la mayoría de los sistemas)
python -m http.server 8080

# Opción 2: Node (si tienes Node instalado, sin instalar nada más)
npx serve .
```

Luego abre `http://localhost:8080` en el navegador.

## Contenido a completar

- **Videos del carrusel**: se generan desde el arreglo `VIDEOS` al inicio de la
  sección 2 en `script.js` (busca `var VIDEOS = [`). Cada objeto necesita
  `videoId` (lo que va después de `v=` en la URL de YouTube), `title`,
  `channel` y `date` (formato `"AAAA-MM-DD"`). Puedes tener hasta 10; el orden
  en la lista es el orden en que se muestran (no se ordenan solos).
- **Redes sociales**: en `index.html`, dentro de `.social-links`, los links de
  Twitch e Instagram están como `href="#"` (marcados con `<!-- TODO -->`) — 
  reemplázalos por las URLs reales cuando las tengan. El de YouTube ya apunta
  a `youtube.com/@SpecialDeliveryRO`.
- **Liderazgo**: en la sección "Acerca de la Guild" quedan pendientes el
  Comandante ("Por definir") y los 4 Oficiales ("Pendiente") — busca esos
  textos en `index.html` dentro de `.org-chart` y reemplázalos por los
  nombres reales cuando estén definidos.
- Textos `[placeholder]` en la sección **Reclutamiento** (requisitos, descripción).

## Reemplazar el logo del fantasma

El archivo `assets/mascota-fantasma-icono.svg` es un placeholder generado para que
el sitio funcione de entrada (degradado blanco→celeste, mejillas rosadas). Cuando
tengas el arte final:

1. Reemplazá el archivo manteniendo el mismo nombre y tamaño (340x340, fondo transparente).
2. No hace falta tocar el HTML: el logo del header, el hero, el footer y el favicon
   ya apuntan a esa ruta.

## Deploy gratis (sin build step)

Cualquiera de estas tres opciones sirve el sitio tal cual está, sin pasos de compilación:

### GitHub Pages
1. Sube esta carpeta a un repositorio de GitHub.
2. En el repo: **Settings → Pages → Source**, elige la rama `main` y la carpeta `/root`.
3. GitHub te da una URL tipo `https://tu-usuario.github.io/tu-repo/`.

### Netlify
1. Arrastra la carpeta del proyecto a [app.netlify.com/drop](https://app.netlify.com/drop),
   o conecta el repo de GitHub desde el dashboard de Netlify.
2. Build command: dejar vacío. Publish directory: `.` (raíz del proyecto).

### Vercel
1. Importa el repo desde [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Other**. Build command: vacío. Output directory: `.`.

## Notas de performance

- Los videos de YouTube usan un "facade": se muestra solo la miniatura hasta que
  el usuario hace click, momento en el que recién se crea el `<iframe>` real
  (ver `loadYouTubeVideo` en `script.js`). Esto evita cargar varios reproductores
  de YouTube de entrada.
- Todas las imágenes fuera del primer scroll usan `loading="lazy"`.
- No hay dependencias externas de CSS/JS (sin CDNs de frameworks ni librerías de íconos);
  los íconos son SVG inline directamente en el HTML.
