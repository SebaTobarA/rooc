# [NOMBRE DEL SITIO]

Base de datos y herramientas para la comunidad de **Ragnarok Online Origin
Classic (ROOC)**. Proyecto independiente, sin afiliación con Gravity ni con
ningún otro sitio de la comunidad — diseño, marca y datos son propios.

La v1 cubre los cuatro pilares que suelen faltar en otros sitios no
oficiales:

- **Ítems y equipamiento** (armas, armaduras, accesorios)
- **Bestiario** (monstruos con stats de combate)
- **Mapas** (regiones, monstruos que aparecen, NPCs)
- **Tablas de drop** (relación monstruo → ítem → % de probabilidad)

Cartas, medallas, monturas, pets y simuladores de clase quedan para después
— el esquema de datos ya está pensado para agregarlos como modelos nuevos
sin tocar lo existente (ver [Arquitectura y extensibilidad](#arquitectura-y-extensibilidad)).

> **Los datos cargados por el seed son 100% de ejemplo/placeholder.**
> Nombres, stats y mapas están inventados para poder navegar el sitio de
> punta a punta antes de tener la planilla real de la comunidad.

## Stack técnico

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- [Prisma ORM](https://www.prisma.io/) 6.x + PostgreSQL (Neon, serverless)
- [Tailwind CSS 4](https://tailwindcss.com/) para estilos
- Autenticación de admin simple: usuario/contraseña por variable de entorno + cookie firmada (sin sistema de usuarios ni dependencias externas de auth)
- [zod](https://zod.dev/) para validar formularios y datos importados
- [csv-parse](https://csv.js.org/parse/) para la importación masiva por CSV

## Requisitos

- Node.js 20 o superior
- npm

## Cómo correr el proyecto en local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# (en Windows sin bash: copy .env.example .env)
# Completá DATABASE_URL con tu propia base de Neon (ver sección "Base de datos")

# 3. Aplicar el esquema a la base de datos
npx prisma migrate dev

# 4. Cargar datos de ejemplo (placeholder)
npm run db:seed

# 5. Levantar el servidor de desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) para el sitio público y
[http://localhost:3000/admin/login](http://localhost:3000/admin/login) para
el panel de administración (usuario/contraseña definidos en `.env`, por
defecto `admin` / `cambiame123` — **cambialos antes de desplegar**).

## Base de datos

### PostgreSQL (Neon, gratis) — misma base para desarrollo y producción

El proyecto usa Postgres tanto en desarrollo como en producción (sin
SQLite), para no tener dos configuraciones distintas. Se usa
[Neon](https://neon.tech/) por su plan gratuito y su CLI (`neonctl`), pero
[Supabase](https://supabase.com/) funciona igual de bien si lo preferís.

1. Creá una cuenta en [neon.tech](https://neon.tech/) (o iniciá sesión con GitHub).
2. Creá un proyecto nuevo (podés usar la web o `npx neonctl@latest init` desde la terminal).
3. Copiá la connection string que te da Neon (incluye usuario, password, host y `?sslmode=require`) y pegala en `DATABASE_URL` dentro de tu `.env`.
4. Corré las migraciones contra esa base:

   ```bash
   npx prisma migrate dev
   ```

5. Cargá los datos de ejemplo con `npm run db:seed`, o directamente tus propios datos con la [importación masiva](#importación-masiva-csvjson).

En producción (Vercel u otro hosting) se usa la **misma** `DATABASE_URL`
apuntando a este proyecto de Neon (o a otro separado, si preferís no
mezclar datos de prueba con datos reales — para eso creás un segundo
proyecto en Neon y usás esa connection string solo en producción).

### Prisma Studio

Para ver/editar la base con una UI visual (útil para debug, no reemplaza al
panel admin):

```bash
npm run db:studio
```

## Seed de datos de ejemplo

`prisma/seed.ts` carga 3 mapas, 8 monstruos, 10 ítems y 12 drops
**inventados**, solo para tener el sitio navegable de punta a punta. Se
puede re-correr en cualquier momento (usa `upsert`, no duplica datos):

```bash
npm run db:seed
```

Podés borrar o reemplazar libremente este archivo cuando tengas tus propios
datos — no es necesario para que el sitio funcione, solo para probarlo.

## Importación masiva (CSV/JSON)

Cuando tengas la planilla real de la comunidad, hay dos formas de cargarla
sin tocar código:

### Opción A: desde el panel admin

1. Entrá a `/admin/import`.
2. Elegí la tabla (Ítems, Monstruos, Mapas o Drops) y subí un archivo `.csv`
   o `.json` con el formato esperado (ver abajo).
3. El resultado muestra cuántas filas se crearon, cuántas se actualizaron y
   el detalle de las filas con error (no bloquean el resto de la
   importación).

### Opción B: desde la línea de comandos

```bash
npm run import -- --type items --file data/mis-items.csv
npm run import -- --type monsters --file data/mis-monstruos.json
npm run import -- --type maps --file data/mis-mapas.csv
npm run import -- --type drops --file data/mis-drops.csv
```

`--type` acepta `items`, `monsters`, `maps` o `drops`. El formato (CSV o
JSON) se detecta por la extensión del archivo.

### Formato esperado de cada tabla

Los archivos de ejemplo completos (uno `.csv` y uno `.json` por tabla) están
en [`data/examples/`](data/examples/). Resumen de columnas:

| Tabla | Columnas |
|---|---|
| **items** | `name`*, `category`, `slot`*, `weaponType`, `levelReq`*, `rarity`, `description`, `stats`, `iconUrl` |
| **monsters** | `name`*, `level`*, `hp`*, `atk`*, `atkMax`, `def`, `element`, `elementLevel`, `race`*, `size`, `description`, `iconUrl` |
| **maps** | `name`*, `region`*, `description` |
| **drops** | `monster`* (nombre o slug), `item`* (nombre o slug), `rate`* |

`*` = obligatorio. El resto tiene valores por defecto razonables (ver
`src/lib/import/importers.ts`).

Los valores de enums (`slot`, `weaponType`, `rarity`, `element`, `race`,
`size`) no distinguen mayúsculas/minúsculas al importar, pero deben
coincidir con alguno de los valores definidos en `prisma/schema.prisma`
(ej. `slot` acepta `WEAPON`, `ARMOR`, `SHIELD`, `SHOES`, `GARMENT`,
`ACCESSORY`, `HEAD_TOP`, `HEAD_MID`, `HEAD_LOW`).

**Importante:** para importar `drops`, primero tenés que haber importado
(o cargado manualmente) los monstruos e ítems que se referencian — la
importación busca la fila existente por nombre o slug, no la crea.

Tanto la importación por CLI como por admin usan el mismo código
(`src/lib/import/`), así que se comportan igual.

## Panel de administración

- URL: `/admin/login`
- Credenciales: variables de entorno `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  (usuario único, sin tabla de usuarios — pensado para un solo
  administrador o para compartir credenciales dentro de un equipo chico).
- La sesión es una cookie HTTP-only firmada con `ADMIN_SESSION_SECRET`
  (HMAC-SHA256), válida por 7 días. Generá tu propio secreto con:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- Desde el panel se pueden crear/editar/eliminar ítems, monstruos, mapas
  (incluyendo sus NPCs) y drops, además de asociar monstruos a mapas.
- Los registros creados o editados desde el panel se marcan automáticamente
  como "no placeholder" (`isPlaceholder: false`), para poder distinguir tus
  datos reales de los datos de ejemplo del seed.

### Login alternativo con Discord

Además de usuario/contraseña, `/admin/login` tiene un botón para iniciar
sesión con Discord. No hay tabla de usuarios ni roles: cualquier cuenta de
Discord puede intentar loguearse, pero solo se deja pasar a los IDs
listados en `ADMIN_DISCORD_IDS` (separados por coma) — el resto recibe un
error de "cuenta no autorizada".

Para activarlo:

1. Creá una aplicación en el [Discord Developer Portal](https://discord.com/developers/applications).
2. En la sección **OAuth2**, agregá como Redirect URI tanto
   `http://localhost:3000/api/admin/discord/callback` (para desarrollo) como
   `https://tu-dominio/api/admin/discord/callback` (para producción).
3. Copiá el **Client ID** y el **Client Secret** a `DISCORD_CLIENT_ID` y
   `DISCORD_CLIENT_SECRET` en tu `.env` (y en las variables de entorno de
   Vercel).
4. Activá el "Modo desarrollador" en Discord (Configuración de usuario >
   Avanzado) para poder copiar tu ID haciendo clic derecho sobre tu perfil,
   y agregalo a `ADMIN_DISCORD_IDS`.

Si `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` no están configurados, el
botón de Discord simplemente va a fallar al hacer clic — el login por
usuario/contraseña sigue funcionando igual.

## Arquitectura y extensibilidad

El esquema (`prisma/schema.prisma`) tiene 4 modelos principales — `Item`,
`Monster`, `GameMap`, `Drop` — más `MapMonster` (relación N:N) y `Npc` como
apoyo de `GameMap`.

Para agregar una categoría nueva en el futuro (cartas, medallas, monturas,
pets, etc.):

1. Agregá un modelo nuevo en `prisma/schema.prisma` (ej. `model Card { ... }`), con sus propios campos y, si corresponde, una relación hacia `Item` o `Monster`.
2. Corré `npx prisma migrate dev --name add_cards`.
3. Creá las páginas públicas (`src/app/cards/`) y, si querés, el CRUD de admin (`src/app/admin/(panel)/cards/`) siguiendo el mismo patrón que ya existe para ítems/monstruos/mapas/drops (server actions en `src/lib/actions/`, formulario en `src/components/forms/`).

No hace falta tocar ninguno de los 4 pilares existentes para hacerlo — por
eso el campo `category` en `Item` ya existe (por si en algún momento conviene
modelar algo nuevo como una variante de `Item` en vez de un modelo propio),
pero lo normal para contenido realmente distinto es un modelo nuevo, como
se explica arriba.

## Identidad visual

Tema oscuro celeste (`#6fe0f5`) + rosa (`#ffb3c6`), con títulos en
mayúsculas y degradado (misma paleta y tratamiento tipográfico que
Special Delivery). Definido en `src/app/globals.css` (variables `--accent`,
`--secondary`, `--gradient-title`, clases `.heading-gradient` y
`.btn-brand`) y `src/config/site.ts`. Para cambiar la marca:

- **Nombre del sitio**: editá `siteConfig.name` / `shortName` en `src/config/site.ts`.
- **Colores**: editá las variables CSS en `src/app/globals.css` (`--accent`, `--background`, etc.).
- **Logo**: reemplazá el bloque `<span>` con la letra "R" en `src/components/site-header.tsx` por tu propio ícono/imagen.

Los íconos de armas (`public/icons/weapons/`) y de slots de equipo
(`public/icons/slots/`) son arte propio (set "Dawn", variante roja) usado
como placeholder por defecto según el tipo de ítem — ver
`src/lib/weapon-icons.ts` para el mapeo. Los archivos originales de mayor
tamaño quedan en `assets-source/dawn-icons-original/` por si querés usarlos
para otra variante. Podés subir un ícono propio por ítem/monstruo desde el
panel admin (campo "URL de ícono"); si se deja vacío, se usa el placeholder
correspondiente.

## Estructura del proyecto

```
prisma/
  schema.prisma        # modelos, enums y relaciones
  seed.ts               # datos de ejemplo (placeholder)
  migrations/
scripts/
  import.ts             # importación masiva por CLI
data/
  examples/              # CSV/JSON de ejemplo con el formato esperado
src/
  app/
    page.tsx             # inicio
    items/, monsters/, maps/   # páginas públicas (lista + detalle)
    admin/
      login/              # login (sin protección de proxy)
      (panel)/            # todo lo que requiere sesión: dashboard, CRUD, import
    api/admin/            # login, logout, import (protegidos por src/proxy.ts)
  components/             # UI compartida (cards, tablas de drop, forms/)
  lib/
    actions/              # server actions (mutaciones del admin)
    import/                # parseo CSV/JSON + lógica de importación
    prisma.ts, session.ts, slug.ts, weapon-icons.ts, labels.ts
  proxy.ts                # protege /admin/* y /api/admin/* (excepto login)
public/
  icons/                  # íconos placeholder (armas, slots, genéricos)
assets-source/
  dawn-icons-original/    # arte original en mayor resolución
```

## Desplegar gratis (Vercel + Postgres serverless)

1. Tené lista tu base en Neon (ver [Base de datos](#base-de-datos) arriba) y el repo subido a GitHub.
2. En [Vercel](https://vercel.com/), importá el repo (el framework Next.js
   se detecta solo).
3. Cargá las variables de entorno en el proyecto de Vercel: `DATABASE_URL`,
   `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
4. En **Build Command**, usá `prisma migrate deploy && next build` (o
   agregá `"vercel-build": "prisma migrate deploy && next build"` a los
   `scripts` de `package.json` y dejá que Vercel lo detecte solo).
5. Desplegá. Una vez arriba, corré el seed manualmente si querés datos de
   ejemplo en producción (`npx prisma db seed` con `DATABASE_URL` apuntando
   a esa base), o cargá tus datos reales por el panel admin / importación
   masiva.

## Limitaciones conocidas de la v1

- Sin buscador full-text ni ranking de relevancia: los filtros son por
  igualdad/`contains` simple.
- Sin paginación en las listas (asumible con decenas/cientos de registros;
  si la base crece mucho, agregar `skip`/`take` a las queries de
  `src/app/items/page.tsx`, `monsters/page.tsx` y `maps/page.tsx`).
- Un solo usuario admin (sin roles ni auditoría de quién cambió qué).
- Los íconos son placeholders locales; no hay upload de imágenes desde el
  panel (el campo "URL de ícono" espera una URL ya alojada en otro lado, o
  una ruta dentro de `public/`).
