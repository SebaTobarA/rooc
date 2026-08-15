/**
 * Capturas de pantalla que el postulante debe subir en /panel/postulacion.
 *
 * Fuente única de la lista: el formulario genera un campo por entrada, la
 * Server Function las valida y /admin/recruitment las muestra en este mismo
 * orden. Para pedir una captura más, se agrega acá + el campo `shot...`
 * correspondiente en el modelo GuildApplication (prisma/schema.prisma).
 *
 * `field` tiene que coincidir exactamente con el nombre de la columna.
 */
export const APPLICATION_SCREENSHOTS = [
  {
    field: "shotPlayerPower",
    label: "Poder de jugador",
    hint: "Entra a la estadística tocando el ícono de personaje y toma la captura.",
  },
  {
    field: "shotFeathers",
    label: "Registro de Plumas",
    hint: "",
  },
  {
    field: "shotGearRefine",
    label: "Registro de Equipamiento y Refine",
    hint: "",
  },
  {
    field: "shotMountLevel",
    label: "Registro de Montura — nivel",
    hint: "El nivel de la montura.",
  },
  {
    field: "shotMountKiwis",
    label: "Registro de Montura — kiwis",
    hint: "Los kiwis, en una captura aparte del nivel.",
  },
  {
    field: "shotMonsterResearch",
    label: "Monster Research",
    hint: "",
  },
  {
    field: "shotCards",
    label: "Cartas",
    hint: "",
  },
  {
    field: "shotPets",
    label: "Pets",
    hint: "",
  },
] as const;

export type ApplicationScreenshotField = (typeof APPLICATION_SCREENSHOTS)[number]["field"];

/** Tamaño máximo por captura. El límite real de Vercel para el cuerpo de una
 *  petición es 4.5 MB, y cada imagen se sube en su propia petición. */
export const SCREENSHOT_MAX_BYTES = 4 * 1024 * 1024;
