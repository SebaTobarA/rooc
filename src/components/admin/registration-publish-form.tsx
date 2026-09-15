"use client";

import { useActionState } from "react";
import type { EventChannelOption } from "@/lib/discord-guild-channels";
import { publishRegistrationAction, type PublishRegistrationState } from "@/lib/actions/registration";
import { Field, inputClass } from "@/components/forms/form-fields";

export function RegistrationPublishForm({
  channels,
  currentChannelId,
}: {
  channels: EventChannelOption[];
  currentChannelId: string | null;
}) {
  const [state, formAction, pending] = useActionState<PublishRegistrationState, FormData>(
    publishRegistrationAction,
    {}
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Field
        label="Canal del mensaje de registro"
        hint="Si ya está publicado en ese canal se actualiza en el lugar; si eliges otro, se borra el anterior."
      >
        <select name="channelId" defaultValue={currentChannelId ?? ""} required className={inputClass}>
          <option value="" disabled>
            Elige un canal
          </option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.category ? `${channel.category} / ${channel.label}` : channel.label}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" disabled={pending} className="btn-brand px-4 py-2 text-sm">
        {pending ? "Publicando…" : currentChannelId ? "Republicar mensaje" : "Publicar mensaje"}
      </button>
      {state.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
      {state.done && !pending && <p className="w-full text-sm text-muted">Publicado en Discord ✅</p>}
    </form>
  );
}
