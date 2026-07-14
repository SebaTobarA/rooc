export function BotErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-5">
      <h2 className="font-semibold text-foreground">No se pudo conectar con el bot de Discord</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <p className="mt-3 text-sm text-muted">
        Revisá que <code className="text-accent">DISCORD_BOT_TOKEN</code> y{" "}
        <code className="text-accent">DISCORD_GUILD_ID</code> estén configurados, que el bot esté
        invitado al server y que tenga el &quot;Server Members Intent&quot; activado.
      </p>
    </div>
  );
}
