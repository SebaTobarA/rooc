"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { publishRegistrationMessage } from "@/lib/registration-discord";

export type PublishRegistrationState = { error?: string; done?: boolean };

/** Publica (o actualiza en el lugar) el mensaje de registro de Boo en el canal elegido. */
export async function publishRegistrationAction(
  _previous: PublishRegistrationState,
  formData: FormData
): Promise<PublishRegistrationState> {
  const session = await getSession();
  if (!session?.isAdmin) return { error: "Solo un admin puede publicar el mensaje de registro." };

  const channelId = String(formData.get("channelId") ?? "");
  if (!channelId) return { error: "Elige un canal." };

  try {
    await publishRegistrationMessage(channelId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo publicar el mensaje en Discord." };
  }

  revalidatePath("/admin/registro");
  return { done: true };
}
