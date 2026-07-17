import type { DiscordGuildChannel } from "@/lib/discord-bot";
import { setDefaultEventChannel } from "@/lib/actions/guild-event-settings";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";

export function ChannelSettingsForm({
  channels,
  currentChannelId,
}: {
  channels: DiscordGuildChannel[];
  currentChannelId: string | null;
}) {
  return (
    <form action={setDefaultEventChannel} className="flex flex-wrap items-end gap-3">
      <Field label="Canal de Discord para publicar eventos" hint="Se usa para todos los eventos nuevos.">
        <select name="channelId" defaultValue={currentChannelId ?? ""} required className={inputClass}>
          <option value="" disabled>
            Elige un canal
          </option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </select>
      </Field>
      <SubmitButton>Guardar canal</SubmitButton>
    </form>
  );
}
