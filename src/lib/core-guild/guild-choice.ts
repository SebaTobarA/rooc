/**
 * SpecialDelivery 1-4: las cuatro guilds in-game que la encuesta de
 * organización (ver survey-*.ts) le ofrece elegir a cada miembro, y el rol
 * de Discord que corresponde asignarle automáticamente según su respuesta.
 * SD1 es la guild principal — mismo rol que CORE_GUILD_ROLE_ID. SD4 todavía
 * no tiene rol propio en Discord, así que su entrada es null: la encuesta
 * guarda la elección pero no intenta asignar nada.
 */

import { CORE_GUILD_ROLE_ID } from "@/lib/core-guild/sync";
import type { GuildChoice } from "@/lib/core-guild/types";

export const GUILD_CHOICE_LABELS: Record<GuildChoice, string> = {
  SD1: "SpecialDelivery 1",
  SD2: "SpecialDelivery 2",
  SD3: "SpecialDelivery 3",
  SD4: "SpecialDelivery 4",
};

export const GUILD_CHOICE_OPTIONS: GuildChoice[] = ["SD1", "SD2", "SD3", "SD4"];

export const GUILD_CHOICE_ROLE_ID: Record<GuildChoice, string | null> = {
  SD1: CORE_GUILD_ROLE_ID,
  SD2: "1530393959937998999",
  SD3: "1530394033245913088",
  SD4: null,
};
