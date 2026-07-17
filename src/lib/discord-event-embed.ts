/**
 * Funciones puras (sin I/O) para armar el embed del roster de un evento y
 * los botones que lo acompañan. Separado de src/lib/events.ts (que sí hace
 * I/O — Prisma + API de Discord) para poder testear/ajustar el formato sin
 * tocar nada de red.
 */

import type { Event, EventSignup, EventTemplate } from "@prisma/client";
import type { DiscordActionRow, DiscordButton, DiscordButtonStyle, DiscordEmbed } from "@/lib/discord-bot";
import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";

const FALLBACK_COLOR = 0x6fe0f5;
const MAX_FIELD_VALUE = 1024;

export const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});
export const TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
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

function truncateFieldValue(lines: string[]): string {
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
    const lines = list.map((s) => (s.status === "LATE" ? `${s.displayName} (tarde)` : s.displayName));
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
      "",
      "**Description:**",
      event.description || "-",
    ].join("\n"),
    color: hexToDiscordColor(template.embedColor),
    fields,
    footer: { text: `${confirmed} confirmados · ${late} tarde · ${cant} no asisten` },
    timestamp: event.startsAt.toISOString(),
  };
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

export function buildClassPickerComponents(
  eventId: string,
  jobRoles: { id: string; name: string }[]
): DiscordActionRow[] {
  return chunk(jobRoles, 5).map((row) => ({
    type: 1,
    components: row.map((role) => button(role.name, 2, makeCustomId("p", eventId, role.id))),
  }));
}

export type InteractionAction = "j" | "l" | "o" | "y" | "n" | "p";

export function makeCustomId(action: InteractionAction, eventId: string, roleId?: string): string {
  return roleId ? `${action}:${eventId}:${roleId}` : `${action}:${eventId}`;
}

export function parseCustomId(customId: string): { action: string; eventId: string; roleId?: string } {
  const [action, eventId, roleId] = customId.split(":");
  return { action, eventId, roleId };
}
