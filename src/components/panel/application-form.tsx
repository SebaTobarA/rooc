"use client";

import { useState, type ChangeEvent } from "react";
import { inputClass } from "@/components/forms/form-fields";
import {
  APPLICATION_SCREENSHOTS,
  SCREENSHOT_MAX_BYTES,
  type ApplicationScreenshotField,
} from "@/lib/recruitment-screenshots";

type UploadState = Partial<Record<ApplicationScreenshotField, string>>;
type BusyState = Partial<Record<ApplicationScreenshotField, boolean>>;
type ErrorState = Partial<Record<ApplicationScreenshotField, string>>;

/**
 * Formulario de postulación. Es un componente cliente porque las capturas se
 * suben apenas se eligen (una petición por imagen a /api/postulacion/upload) y
 * el botón de enviar queda bloqueado hasta que estén las 8 — así nadie manda
 * una postulación a medias que después el oficial tenga que ir a reclamar.
 *
 * La Server Function recibe solo las URLs ya subidas, no los archivos, así que
 * el envío es liviano y no toca el límite de tamaño de las Server Actions.
 */
export function ApplicationForm({
  action,
  jobRoleNames,
}: {
  action: (formData: FormData) => void | Promise<void>;
  jobRoleNames: readonly string[];
}) {
  const [urls, setUrls] = useState<UploadState>({});
  const [busy, setBusy] = useState<BusyState>({});
  const [errors, setErrors] = useState<ErrorState>({});

  const uploadedCount = APPLICATION_SCREENSHOTS.filter((shot) => urls[shot.field]).length;
  const allUploaded = uploadedCount === APPLICATION_SCREENSHOTS.length;
  const anyBusy = Object.values(busy).some(Boolean);

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    field: ApplicationScreenshotField
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Se valida acá además del servidor para no gastar la subida entera y
    // poder avisar al instante.
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, [field]: "El archivo debe ser una imagen." }));
      event.target.value = "";
      return;
    }
    if (file.size > SCREENSHOT_MAX_BYTES) {
      setErrors((prev) => ({ ...prev, [field]: "La captura no puede superar los 4 MB." }));
      event.target.value = "";
      return;
    }

    setBusy((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: "" }));

    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/postulacion/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir la captura.");
      setUrls((prev) => ({ ...prev, [field]: data.url as string }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [field]: err instanceof Error ? err.message : "No se pudo subir la captura.",
      }));
      event.target.value = "";
    } finally {
      setBusy((prev) => ({ ...prev, [field]: false }));
    }
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Nombre de personaje</span>
        <input
          type="text"
          name="characterName"
          required
          placeholder="Ej: PolloGomez"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Clase</span>
        <select name="className" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Elige tu clase
          </option>
          {jobRoleNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Nivel base / job</span>
        {/* El patrón acepta base 1-99 y job opcional 1-70, con la misma regla
            que revalida parseLevelText en el servidor. Sin esto, un nivel
            inválido pasaba la validación del navegador y el servidor lo
            descartaba en silencio, sin explicarle nada al postulante. */}
        <input
          type="text"
          name="levelText"
          required
          inputMode="numeric"
          placeholder="Ej: 99/70"
          pattern="(?:[1-9]|[1-9][0-9])(?:\s*/\s*(?:[1-9]|[1-6][0-9]|70))?"
          title="Nivel base de 1 a 99, y si quieres el job después de una barra: 99/70"
          className={inputClass}
        />
        <span className="text-xs text-muted">
          El nivel base máximo es 99. Puedes poner solo el base (99) o base/job (99/70).
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Disponibilidad horaria</span>
        <input
          type="text"
          name="availability"
          required
          placeholder="Ej: noches entre semana y fines de semana"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Cuéntanos un poco de ti (opcional)</span>
        <textarea
          name="aboutYou"
          rows={4}
          placeholder="Experiencia previa en guilds, qué buscas en Special Delivery, etc."
          className={inputClass}
        />
      </label>

      <fieldset className="mt-2 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">
          Capturas de progreso
        </legend>
        <p className="text-xs text-muted">
          Las 8 son obligatorias. Cada una hasta 4 MB, en imagen (PNG o JPG).{" "}
          <span className="text-foreground">
            {uploadedCount} de {APPLICATION_SCREENSHOTS.length} subidas
          </span>
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {APPLICATION_SCREENSHOTS.map((shot) => {
            const url = urls[shot.field];
            const isBusy = busy[shot.field];
            const error = errors[shot.field];

            return (
              <div key={shot.field} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  {shot.label} <span className="text-accent">*</span>
                </span>
                {shot.hint && <span className="text-xs text-muted">{shot.hint}</span>}

                {/* Lo que viaja en el envío es la URL ya subida, no el archivo */}
                <input type="hidden" name={shot.field} value={url ?? ""} />

                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Captura de ${shot.label}`}
                      className="h-28 w-full rounded-md border border-border bg-background-elevated object-contain p-1"
                    />
                  </a>
                )}

                <input
                  type="file"
                  accept="image/*"
                  required={!url}
                  onChange={(event) => handleFileChange(event, shot.field)}
                  className="text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-background-elevated file:px-3 file:py-1.5 file:text-sm file:text-foreground"
                />

                {isBusy && <span className="text-xs text-muted">Subiendo…</span>}
                {url && !isBusy && <span className="text-xs text-muted">Lista ✓</span>}
                {error && <span className="text-xs text-accent">{error}</span>}
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!allUploaded || anyBusy}
          className="btn-brand px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar postulación
        </button>
        {!allUploaded && (
          <span className="text-xs text-muted">
            Faltan {APPLICATION_SCREENSHOTS.length - uploadedCount} captura(s) por subir.
          </span>
        )}
      </div>
    </form>
  );
}
