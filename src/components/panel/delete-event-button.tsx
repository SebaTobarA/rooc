"use client";

export function DeleteEventButton({
  action,
  isGrouped,
}: {
  action: () => void | Promise<void>;
  isGrouped: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const warning = isGrouped
          ? "¿Seguro que querés eliminar este evento? Es parte de una semana combinada: se van a borrar los 3 días y el mensaje de Discord. Esta acción no se puede deshacer."
          : "¿Seguro que querés eliminar este evento? Si ya está publicado, también se borra el mensaje de Discord. Esta acción no se puede deshacer.";
        if (!window.confirm(warning)) e.preventDefault();
      }}
    >
      <button type="submit" className="text-sm text-muted hover:text-accent">
        Eliminar evento
      </button>
    </form>
  );
}
