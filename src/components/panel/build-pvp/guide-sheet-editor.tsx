"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { updateGuideSheet } from "@/lib/actions/build-history";
import { GUIDE_SECTIONS, type GuideEntry, type GuideSectionKey } from "@/lib/class-guide";

const FIELD_CLASS =
  "w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

/**
 * Editor de la hoja de un tipo de build: nombre, descripción y las secciones
 * de la guía (accesorios, encantamientos, monturas, equipo divino), cada una
 * como lista ordenada por prioridad. El árbol de skills se edita aparte, en
 * el planificador.
 */
export function GuideSheetEditor({
  buildId,
  initial,
  suggestions,
}: {
  buildId: string;
  initial: { name: string; description: string } & Record<GuideSectionKey, GuideEntry[]>;
  /** Nombres de la base de datos para autocompletar cada sección. */
  suggestions: Partial<Record<GuideSectionKey, string[]>>;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [sections, setSections] = useState<Record<GuideSectionKey, GuideEntry[]>>({
    accessories: initial.accessories,
    enchants: initial.enchants,
    mounts: initial.mounts,
    divineEquip: initial.divineEquip,
  });
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();

  function patchSection(key: GuideSectionKey, update: (entries: GuideEntry[]) => GuideEntry[]) {
    setSections((prev) => ({ ...prev, [key]: update(prev[key]) }));
    setMessage(null);
  }

  function move(key: GuideSectionKey, index: number, delta: -1 | 1) {
    patchSection(key, (entries) => {
      const next = [...entries];
      const target = index + delta;
      if (target < 0 || target >= next.length) return entries;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function save() {
    startSaving(async () => {
      const result = await updateGuideSheet(buildId, { name, description, ...sections });
      setMessage(result.error ? { kind: "error", text: result.error } : { kind: "ok", text: "Hoja guardada." });
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,18rem)_1fr]">
        <label className="block text-xs text-muted">
          Nombre del tipo de build
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={`mt-1 ${FIELD_CLASS}`} />
        </label>
        <label className="block text-xs text-muted">
          Descripción (qué hace esta build y cuándo conviene)
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            className={`mt-1 ${FIELD_CLASS}`}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {GUIDE_SECTIONS.map((section, sectionIndex) => {
          const entries = sections[section.key];
          const listId = `guide-suggest-${section.key}`;
          return (
            <div key={section.key} className="rounded-xl border border-border bg-background-elevated p-4">
              <p className="text-sm font-semibold text-foreground">
                {sectionIndex + 2}. {section.label}
              </p>
              <p className="text-xs text-muted">{section.hint} El primero es el de mayor prioridad.</p>
              {suggestions[section.key] && (
                <datalist id={listId}>
                  {suggestions[section.key]?.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              )}
              <ol className="mt-3 flex flex-col gap-2">
                {entries.map((entry, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="mt-2 w-5 shrink-0 text-right text-xs text-muted">{index + 1}.</span>
                    <div className="grid min-w-0 flex-1 gap-1.5">
                      <input
                        value={entry.name}
                        list={suggestions[section.key] ? listId : undefined}
                        onChange={(e) =>
                          patchSection(section.key, (list) =>
                            list.map((item, i) => (i === index ? { ...item, name: e.target.value } : item))
                          )
                        }
                        placeholder="Nombre"
                        maxLength={80}
                        aria-label={`${section.label} ${index + 1}: nombre`}
                        className={FIELD_CLASS}
                      />
                      <input
                        value={entry.detail}
                        onChange={(e) =>
                          patchSection(section.key, (list) =>
                            list.map((item, i) => (i === index ? { ...item, detail: e.target.value } : item))
                          )
                        }
                        placeholder="Detalle, alternativa o por qué (opcional)"
                        maxLength={300}
                        aria-label={`${section.label} ${index + 1}: detalle`}
                        className={`${FIELD_CLASS} text-xs`}
                      />
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5 pt-1">
                      <button
                        type="button"
                        onClick={() => move(section.key, index, -1)}
                        disabled={index === 0}
                        aria-label="Subir prioridad"
                        className="text-muted hover:text-accent disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(section.key, index, 1)}
                        disabled={index === entries.length - 1}
                        aria-label="Bajar prioridad"
                        className="text-muted hover:text-accent disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => patchSection(section.key, (list) => list.filter((_, i) => i !== index))}
                        aria-label="Quitar"
                        className="text-muted hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => patchSection(section.key, (list) => [...list, { name: "", detail: "" }])}
                className="mt-3 flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {message && (
          <p className={`text-sm ${message.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p>
        )}
        <button type="button" onClick={save} disabled={isSaving} className="btn-brand px-5 py-2 text-sm disabled:opacity-50">
          {isSaving ? "Guardando…" : "Guardar hoja"}
        </button>
      </div>
    </div>
  );
}
