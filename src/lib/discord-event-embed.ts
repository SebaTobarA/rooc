/**
 * Funciones puras (sin I/O) para armar el embed del roster de un evento y
 * los botones que lo acompañan. Separado de src/lib/events.ts (que sí hace
 * I/O — Prisma + API de Discord) para poder testear/ajustar el formato sin
 * tocar nada de red.
 */

import type { Event, EventSignup, EventTemplate } from "@prisma/client";
import type { DiscordActionRow, DiscordButton, DiscordButtonStyle, DiscordEmbed } from "@/lib/discord-bot";
import type { RosterMember } from "@/lib/event-roster";
import { JOB_ROLE_NAMES, JOB_ROLE_EMOJI } from "@/lib/discord-job-roles";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";

const CHILE_TIME_ZONE = "America/Santiago";
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es-419", { weekday: "long", timeZone: CHILE_TIME_ZONE });
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  timeZone: CHILE_TIME_ZONE,
});

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const FALLBACK_COLOR = 0x6fe0f5;
const MAX_FIELD_VALUE = 1024;

export const DATE_FORMATTER = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});
export const TIME_FORMATTER = new Intl.DateTimeFormat("es-419", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

/** "#6fe0f5" -> 0x6fe0f5. Si el hex es inválido, cae al celeste de marca. */
export function hexToDiscordColor(hex: string): number {
  const parsed = parseInt(hex.replace("#", ""), 16);
  return Number.isNaN(parsed) ? FALLBACK_COLOR : parsed;
}

/**
 * Línea "quiénes pueden responder" del embed, a partir de los roles
 * elegidos al publicar (Event.allowedRoleIds). Se nombran con <@&id> para
 * que Discord los muestre con su nombre y color reales; las menciones
 * dentro de un embed nunca notifican, así que esto no pingea a nadie.
 * Devuelve null para eventos publicados antes de que existiera la pregunta:
 * ahí el embed queda igual que siempre.
 */
export function formatAllowedRolesLine(allowedRoleIds: string[]): string | null {
  if (allowedRoleIds.length === 0) return null;
  return `👥 Pueden responder: ${allowedRoleIds.map((roleId) => `<@&${roleId}>`).join(" ")}`;
}

function formatEventRange(startsAt: Date, endsAt: Date): string {
  const sameDay = DATE_FORMATTER.format(startsAt) === DATE_FORMATTER.format(endsAt);
  if (sameDay) {
    return [
      `📅 ${DATE_FORMATTER.format(startsAt)}`,
      `🕐 ${TIME_FORMATTER.format(startsAt)} - ${TIME_FORMATTER.format(endsAt)}`,
    ].join("\n");
  }
  return [
    `📅 ${DATE_FORMATTER.format(startsAt)} ${TIME_FORMATTER.format(startsAt)}`,
    `→ ${DATE_FORMATTER.format(endsAt)} ${TIME_FORMATTER.format(endsAt)}`,
  ].join("\n");
}

export function truncateFieldValue(lines: string[]): string {
  if (lines.length === 0) return "-";
  let value = "";
  for (let i = 0; i < lines.length; i++) {
    const next = value ? `${value}\n${lines[i]}` : lines[i];
    const remaining = lines.length - i - 1;
    const suffix = remaining > 0 ? `\n… y ${remaining} más` : "";
    if ((next + suffix).length > MAX_FIELD_VALUE) {
      return `${value}\n… y ${lines.length - i} más`;
    }
    value = next;
  }
  return value;
}

/** Una persona del roster tal como se pinta en su columna de job. */
interface RosterEntry extends RosterMember {
  /** Aclaración al lado del nombre, ej. "tarde" o "Inasistencia: D". */
  note: string | null;
}

/**
 * Las 14 columnas de clases en el orden canónico (el mismo de
 * JOB_ROLE_NAMES), más una columna extra con quienes todavía no tienen rol
 * de clase en Discord — esos son justamente los que necesitan el botón
 * "Cambiar de job". Los campos van inline: Discord los acomoda de a 3 por
 * fila.
 */
function buildJobFields(
  entries: RosterEntry[],
  withEmoji: boolean
): { name: string; value: string; inline?: boolean }[] {
  const fields = JOB_ROLE_NAMES.map((jobName) => {
    const list = entries.filter((entry) => entry.job === jobName);
    const emoji = withEmoji ? JOB_ROLE_EMOJI[jobName] : undefined;
    const prefix = emoji ? `${emoji} ` : "";
    const lines = list.map((entry) => `${prefix}${entry.displayName}${entry.note ? ` (${entry.note})` : ""}`);
    return { name: `${jobName} (${list.length})`, value: truncateFieldValue(lines), inline: true };
  });

  const sinClase = entries.filter((entry) => entry.job === null);
  if (sinClase.length > 0) {
    fields.push({
      name: `Sin clase (${sinClase.length})`,
      value: truncateFieldValue(
        sinClase.map((entry) => `${entry.displayName}${entry.note ? ` (${entry.note})` : ""}`)
      ),
      inline: true,
    });
  }

  return fields;
}

/**
 * Un embed entero no puede pasar de 6000 caracteres. El roster lista a toda
 * la gente con el rol habilitado (más de 120 hoy), así que si el server
 * crece los emojis de clase —35 caracteres cada uno— son lo primero que
 * sobra: se arman los campos con emoji y, si no entran en el presupuesto,
 * se rehacen sin ellos. Lo que queda fuera del presupuesto lo recorta
 * truncateFieldValue campo por campo.
 */
const ROSTER_FIELDS_BUDGET = 5000;

function fieldsLength(fields: { name: string; value: string }[]): number {
  return fields.reduce((total, field) => total + field.name.length + field.value.length, 0);
}

function buildRosterFields(
  entries: RosterEntry[],
  extraFields: { name: string; value: string }[]
): { name: string; value: string; inline?: boolean }[] {
  const withEmoji = [...buildJobFields(entries, true), ...extraFields];
  if (fieldsLength(withEmoji) <= ROSTER_FIELDS_BUDGET) return withEmoji;
  return [...buildJobFields(entries, false), ...extraFields];
}

/** "Domingo" -> "D". Se usa para marcar de qué día avisó que falta. */
export function weekdayLetter(date: Date): string {
  return capitalize(WEEKDAY_FORMATTER.format(date)).charAt(0);
}

export function buildEventEmbed(
  event: Event,
  signups: EventSignup[],
  template: Pick<EventTemplate, "icon" | "embedColor">
): DiscordEmbed {
  const byClass = new Map<string, EventSignup[]>();
  for (const signup of signups) {
    if (signup.status === "NOT_ATTENDING") continue;
    const list = byClass.get(signup.className) ?? [];
    list.push(signup);
    byClass.set(signup.className, list);
  }

  const fields = JOB_ROLE_NAMES.map((className) => {
    const list = (byClass.get(className) ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName));
    const emoji = JOB_ROLE_EMOJI[className];
    const prefix = emoji ? `${emoji} ` : "";
    const lines = list.map((s) => `${prefix}${s.displayName}${s.status === "LATE" ? " (tarde)" : ""}`);
    return { name: `${className} (${list.length})`, value: truncateFieldValue(lines), inline: true };
  });

  const confirmed = signups.filter((s) => s.status === "CONFIRMED").length;
  const late = signups.filter((s) => s.status === "LATE").length;
  const cant = signups.filter((s) => s.status === "NOT_ATTENDING").length;

  return {
    title: template.icon ? `${template.icon} ${event.title}` : event.title,
    description: [
      "**Event Info:**",
      formatEventRange(event.startsAt, event.endsAt),
      // El cierre de inscripciones se puede correr después de publicado
      // (ver updateEventSignupsCloseAt), así que se muestra siempre: es el
      // dato que define hasta cuándo los botones de abajo siguen aceptando
      // gente, y no tiene por qué coincidir con el fin del evento.
      `🔒 Inscripciones hasta ${DATE_FORMATTER.format(event.signupsCloseAt)} ${TIME_FORMATTER.format(event.signupsCloseAt)}`,
      formatAllowedRolesLine(event.allowedRoleIds),
      "",
      "**Description:**",
      event.description || "-",
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    color: hexToDiscordColor(template.embedColor),
    fields,
    footer: { text: `${confirmed} confirmados · ${late} tarde · ${cant} no asisten` },
    timestamp: event.startsAt.toISOString(),
  };
}

/**
 * Embed del roster para templates en modo DECLINE ("marcar inasistencia"):
 * a diferencia de buildEventEmbed, acá no hay que confirmar nada para
 * participar — solo se lista a quienes avisaron que llegan tarde o que no
 * van. El horario de cierre se muestra con timestamp dinámico de Discord
 * (<t:...>) en vez de una hora fija, para que cada persona lo vea ya
 * convertido a su propia zona horaria.
 */
export function buildDeclineEventEmbed(
  event: Event,
  signups: EventSignup[],
  template: Pick<EventTemplate, "icon" | "embedColor">
): DiscordEmbed {
  const late = signups.filter((s) => s.status === "LATE");
  const notAttending = signups.filter((s) => s.status === "NOT_ATTENDING");
  const closeTimestamp = Math.floor(event.signupsCloseAt.getTime() / 1000);

  return {
    title: template.icon ? `${template.icon} ${event.title}` : event.title,
    description: [
      "**Event Info:**",
      formatEventRange(event.startsAt, event.endsAt),
      `🔒 Podés cambiar tu respuesta hasta <t:${closeTimestamp}:t> (<t:${closeTimestamp}:R>)`,
      formatAllowedRolesLine(event.allowedRoleIds),
      "",
      "Por defecto **participan todos**. Si vas a llegar tarde o no vas a poder ir, avisá con los botones de abajo.",
      "",
      "**Description:**",
      event.description || "-",
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    color: hexToDiscordColor(template.embedColor),
    fields: [
      { name: `Llegan tarde (${late.length})`, value: truncateFieldValue(late.map((s) => s.displayName)) },
      {
        name: `No asisten (${notAttending.length})`,
        value: truncateFieldValue(notAttending.map((s) => s.displayName)),
      },
    ],
    footer: { text: `${late.length} llegan tarde · ${notAttending.length} no asisten · el resto participa` },
    timestamp: event.startsAt.toISOString(),
  };
}

/**
 * Roster en modo DECLINE con la misma estructura de columnas por job que el
 * embed de confirmación: cada clase con la gente del server que la tiene
 * asignada y que además tiene alguno de los roles habilitados para responder
 * (ver loadEventRoster). Nadie se anota — se arranca con todos adentro y
 * quien avisa que no va desaparece de su columna.
 */
export function buildDeclineRosterEmbed(
  event: Event,
  roster: RosterMember[],
  signups: EventSignup[],
  template: Pick<EventTemplate, "icon" | "embedColor">
): DiscordEmbed {
  const byDiscordId = new Map(signups.map((signup) => [signup.discordId, signup]));
  const closeTimestamp = Math.floor(event.signupsCloseAt.getTime() / 1000);

  const attending: RosterEntry[] = [];
  const notAttending: RosterMember[] = [];
  let lateCount = 0;

  for (const member of roster) {
    const status = byDiscordId.get(member.discordId)?.status;
    if (status === "NOT_ATTENDING") {
      notAttending.push(member);
      continue;
    }
    if (status === "LATE") lateCount++;
    attending.push({ ...member, note: status === "LATE" ? "tarde" : null });
  }

  const fields = buildRosterFields(
    attending,
    notAttending.length > 0
      ? [
          {
            name: `No asisten (${notAttending.length})`,
            value: truncateFieldValue(notAttending.map((member) => member.displayName)),
          },
        ]
      : []
  );

  return {
    title: template.icon ? `${template.icon} ${event.title}` : event.title,
    description: [
      "**Event Info:**",
      formatEventRange(event.startsAt, event.endsAt),
      `🔒 Podés cambiar tu respuesta hasta <t:${closeTimestamp}:t> (<t:${closeTimestamp}:R>)`,
      formatAllowedRolesLine(event.allowedRoleIds),
      "",
      "Por defecto **participan todos**. Si no vas a poder ir, avisá con los botones de abajo y salís de la lista.",
      "",
      "**Description:**",
      event.description || "-",
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    color: hexToDiscordColor(template.embedColor),
    fields,
    footer: {
      text: `${attending.length} participan · ${lateCount} llegan tarde · ${notAttending.length} no asisten`,
    },
    timestamp: event.startsAt.toISOString(),
  };
}

export function buildDeclineRosterComponents(eventId: string): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [
        button("Llegaré tarde", 2, makeCustomId("dl", eventId)),
        button("No asistiré", 4, makeCustomId("dn", eventId)),
        button("Voy a tiempo", 3, makeCustomId("dy", eventId)),
        button("Cambiar de job", 1, makeCustomId("dj", eventId)),
      ],
    },
  ];
}

export interface WeeklyAttendanceDay {
  event: Event;
  signups: EventSignup[];
}

/**
 * Un solo embed que agrupa varios eventos DECLINE de la misma semana (ej.
 * Martes/Jueves Guild League + Domingo WoE) — cada uno se muestra como su
 * propio campo con el nombre del día calculado en hora de Chile, no
 * asumido a partir del orden. El horario de cierre de cada día usa
 * timestamp dinámico de Discord, así cada persona lo ve en su propia zona
 * horaria.
 */
export function buildWeeklyAttendanceEmbed(
  days: WeeklyAttendanceDay[],
  template: Pick<EventTemplate, "embedColor">
): DiscordEmbed {
  const fields = days.map(({ event, signups }) => {
    const late = signups.filter((s) => s.status === "LATE");
    const notAttending = signups.filter((s) => s.status === "NOT_ATTENDING");
    const closeTimestamp = Math.floor(event.signupsCloseAt.getTime() / 1000);
    const dayLabel = capitalize(WEEKDAY_FORMATTER.format(event.startsAt));
    const dateLabel = SHORT_DATE_FORMATTER.format(event.startsAt);

    const lines: string[] = [];
    if (late.length === 0 && notAttending.length === 0) {
      lines.push("✅ Participan todos");
    } else {
      if (late.length > 0) lines.push(`🟡 Llegan tarde: ${late.map((s) => s.displayName).join(", ")}`);
      if (notAttending.length > 0) {
        lines.push(`🔴 No van: ${notAttending.map((s) => s.displayName).join(", ")}`);
      }
    }
    lines.push(`🔒 Cambiás tu respuesta hasta <t:${closeTimestamp}:t> (<t:${closeTimestamp}:R>)`);

    return {
      name: `${dayLabel} ${dateLabel} — ${EVENT_CATEGORY_LABEL[event.category]}`,
      value: truncateFieldValue(lines),
    };
  });

  // Los 3 días de una semana comparten los mismos roles habilitados (ver
  // createAttendanceWeek), así que alcanza con mirar el primero.
  const allowedRolesLine = formatAllowedRolesLine(days[0]?.event.allowedRoleIds ?? []);

  return {
    title: "📋 Asistencia de la semana",
    description: [
      "Marcá los días en que **no** vas a poder jugar con los botones de abajo — por defecto participan todos. Cada horario ya se muestra ajustado a tu propia zona horaria.",
      allowedRolesLine,
    ]
      .filter((line): line is string => line !== null)
      .join("\n\n"),
    color: hexToDiscordColor(template.embedColor),
    fields,
  };
}

/**
 * Igual que buildWeeklyAttendanceEmbed pero con las columnas por job del
 * roster (ver buildDeclineRosterEmbed): una sola lista para toda la semana,
 * donde al lado del nombre se anota de qué días avisó que falta con la
 * inicial del día ("Inasistencia: D" si no va el domingo). Quien avisa que
 * falta a todos los días sale de la lista.
 */
export function buildWeeklyRosterEmbed(
  days: WeeklyAttendanceDay[],
  roster: RosterMember[],
  template: Pick<EventTemplate, "embedColor">
): DiscordEmbed {
  const statusByMember = new Map<string, Map<string, EventSignup["status"]>>();
  for (const { event, signups } of days) {
    for (const signup of signups) {
      const perDay = statusByMember.get(signup.discordId) ?? new Map();
      perDay.set(event.id, signup.status);
      statusByMember.set(signup.discordId, perDay);
    }
  }

  const attending: RosterEntry[] = [];
  const fullyOut: RosterMember[] = [];

  for (const member of roster) {
    const perDay = statusByMember.get(member.discordId);
    const absentDays = days.filter(({ event }) => perDay?.get(event.id) === "NOT_ATTENDING");
    const lateDays = days.filter(({ event }) => perDay?.get(event.id) === "LATE");

    if (absentDays.length === days.length && days.length > 0) {
      fullyOut.push(member);
      continue;
    }

    const notes: string[] = [];
    if (absentDays.length > 0) {
      notes.push(`Inasistencia: ${absentDays.map(({ event }) => weekdayLetter(event.startsAt)).join(" ")}`);
    }
    if (lateDays.length > 0) {
      notes.push(`Tarde: ${lateDays.map(({ event }) => weekdayLetter(event.startsAt)).join(" ")}`);
    }
    attending.push({ ...member, note: notes.length > 0 ? notes.join(" · ") : null });
  }

  const dayLines = days.map(({ event }) => {
    const closeTimestamp = Math.floor(event.signupsCloseAt.getTime() / 1000);
    const dayLabel = capitalize(WEEKDAY_FORMATTER.format(event.startsAt));
    return `🗓️ **${dayLabel} ${SHORT_DATE_FORMATTER.format(event.startsAt)}** (${weekdayLetter(event.startsAt)}) — ${EVENT_CATEGORY_LABEL[event.category]} · cierra <t:${closeTimestamp}:t>`;
  });

  const fields = buildRosterFields(
    attending,
    fullyOut.length > 0
      ? [
          {
            name: `No asisten ningún día (${fullyOut.length})`,
            value: truncateFieldValue(fullyOut.map((member) => member.displayName)),
          },
        ]
      : []
  );

  return {
    title: "📋 Asistencia de la semana",
    description: [
      ...dayLines,
      "",
      "Por defecto **participan todos**. Marcá con los botones los días en que no vas a poder jugar: al lado de tu nombre queda la inicial del día que faltás, y si no vas ninguno salís de la lista.",
      formatAllowedRolesLine(days[0]?.event.allowedRoleIds ?? []),
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    color: hexToDiscordColor(template.embedColor),
    fields,
    footer: { text: `${attending.length} participan · ${fullyOut.length} no asisten ningún día` },
  };
}

export function buildWeeklyAttendanceComponents(
  days: WeeklyAttendanceDay[],
  withJobButton = false
): DiscordActionRow[] {
  const rows: DiscordActionRow[] = days.map(({ event }) => {
    const dayLabel = capitalize(WEEKDAY_FORMATTER.format(event.startsAt));
    return {
      type: 1,
      components: [
        button(`${dayLabel}: llego tarde`, 2, makeCustomId("dl", event.id)),
        button(`${dayLabel}: no voy`, 4, makeCustomId("dn", event.id)),
        button(`${dayLabel}: sí voy`, 3, makeCustomId("dy", event.id)),
      ],
    };
  });

  // El cambio de job no es por día: alcanza con un botón para toda la
  // semana, colgado del primer evento del grupo (cualquiera re-renderiza el
  // mismo mensaje combinado). Discord admite hasta 5 filas, así que solo se
  // agrega si hay lugar.
  if (withJobButton && days.length > 0 && rows.length < 5) {
    rows.push({
      type: 1,
      components: [button("Cambiar de job", 1, makeCustomId("dj", days[0].event.id))],
    });
  }

  return rows;
}

function button(label: string, style: DiscordButtonStyle, customId: string): DiscordButton {
  return { type: 2, style, label, custom_id: customId };
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export function buildRosterComponents(eventId: string): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [
        button("Participar", 3, makeCustomId("j", eventId)),
        button("Llego tarde", 2, makeCustomId("l", eventId)),
        button("No alcanzo", 4, makeCustomId("o", eventId)),
      ],
    },
  ];
}

export function buildConfirmComponents(eventId: string): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [
        button("Sí", 3, makeCustomId("y", eventId)),
        button("No", 2, makeCustomId("n", eventId)),
      ],
    },
  ];
}

/**
 * `action` distingue para qué se está eligiendo la clase: "p" es el flujo de
 * confirmación (cambia el rol y además anota al jugador), "q" es el botón
 * "Cambiar de job" del roster DECLINE, que solo cambia el rol sin tocar la
 * asistencia.
 */
export function buildClassPickerComponents(
  eventId: string,
  jobRoles: { id: string; name: string }[],
  action: "p" | "q" = "p"
): DiscordActionRow[] {
  return chunk(jobRoles, 5).map((row) => ({
    type: 1,
    components: row.map((role) => button(role.name, 2, makeCustomId(action, eventId, role.id))),
  }));
}

export type InteractionAction = "j" | "l" | "o" | "y" | "n" | "p" | "q" | "dl" | "dn" | "dy" | "dj";

export function makeCustomId(action: InteractionAction, eventId: string, roleId?: string): string {
  return roleId ? `${action}:${eventId}:${roleId}` : `${action}:${eventId}`;
}

export function parseCustomId(customId: string): { action: string; eventId: string; roleId?: string } {
  const [action, eventId, roleId] = customId.split(":");
  return { action, eventId, roleId };
}
