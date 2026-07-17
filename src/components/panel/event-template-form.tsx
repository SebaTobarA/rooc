"use client";

import { useState } from "react";
import type { EventTemplate } from "@prisma/client";
import { EventCategory } from "@prisma/client";
import { EVENT_CATEGORY_LABEL } from "@/lib/labels";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";
import { EmbedPreview } from "@/components/panel/embed-preview";

/**
 * Settings a la izquierda, preview en vivo a la derecha — los campos son
 * controlados (no solo defaultValue) para que EmbedPreview reaccione a
 * cada cambio sin esperar al submit del form.
 */
export function EventTemplateForm({
  template,
  action,
}: {
  template?: EventTemplate;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(template?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(template?.category ?? EventCategory.GUILD_LEAGUE);
  const [icon, setIcon] = useState(template?.icon ?? "");
  const [embedColor, setEmbedColor] = useState(template?.embedColor ?? "#6fe0f5");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={action} className="grid gap-4">
        <Field label="Nombre del template" hint="Interno, para identificarlo acá — no se muestra en Discord.">
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Categoría">
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className={inputClass}
          >
            {Object.entries(EVENT_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ícono" hint="Emoji corto, opcional — se antepone al título del embed en Discord.">
          <input
            name="icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={8}
            placeholder="🎫"
            className={inputClass}
          />
        </Field>

        <Field label="Color del embed">
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Color del embed"
              value={embedColor}
              onChange={(e) => setEmbedColor(e.target.value)}
              className="h-10 w-14 rounded-md border border-border bg-background-elevated"
            />
            <input
              name="embedColor"
              value={embedColor}
              onChange={(e) => setEmbedColor(e.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              className={`${inputClass} flex-1`}
            />
          </div>
        </Field>

        <SubmitButton>{template ? "Guardar cambios" : "Crear template"}</SubmitButton>
      </form>

      <EmbedPreview title={title} icon={icon} embedColor={embedColor} />
    </div>
  );
}
