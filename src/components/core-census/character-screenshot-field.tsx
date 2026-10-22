"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, ImageUp, Loader2, XCircle } from "lucide-react";
import { analyzeMyCharacterScreenshot, type ScreenshotAnalysis } from "@/lib/actions/character-screenshot";

// La captura se achica en el navegador antes de mandarla: alcanza para leer
// el texto y entra holgada en el límite de las server actions.
const MAX_SIDE = 1920;

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen."))), "image/jpeg", 0.95)
  );
}

const POWER_FORMATTER = new Intl.NumberFormat("es-CL");

/** Lo que hay escrito en el campo de Power, como número (null si está vacío o no es un número). */
function readTypedPower(input: HTMLInputElement | null): number | null {
  const value = input?.value.trim() ?? "";
  return value === "" || Number.isNaN(Number(value)) ? null : Number(value);
}

/**
 * Paso obligatorio de /panel/ficha: el jugador escribe su Power en el
 * formulario y sube la captura de la ventana "Character" del juego (en
 * español, portugués o inglés) para comprobarlo. Solo se lee el Power: si no
 * coincide con el escrito, no se puede enviar. La imagen no se guarda.
 */
export function CharacterScreenshotField() {
  const [result, setResult] = useState<ScreenshotAnalysis | null>(null);
  const [typedPower, setTypedPower] = useState<number | null>(null);
  const [isAnalyzing, startAnalyzing] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // El campo de Power vive en el formulario (SheetFields), fuera de este
  // componente: se escucha para comparar en vivo con lo leído en la captura.
  useEffect(() => {
    const input = containerRef.current?.closest("form")?.elements.namedItem("power");
    if (!(input instanceof HTMLInputElement)) return;
    const update = () => setTypedPower(readTypedPower(input));
    update();
    input.addEventListener("input", update);
    return () => input.removeEventListener("input", update);
  }, []);

  function applyScreenshotPower(power: number) {
    const input = containerRef.current?.closest("form")?.elements.namedItem("power");
    if (!(input instanceof HTMLInputElement)) return;
    input.value = String(power);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function analyze(file: File | undefined) {
    if (!file) return;
    setResult(null);
    startAnalyzing(async () => {
      try {
        const formData = new FormData();
        formData.set("screenshot", await shrink(file), "captura.jpg");
        setResult(await analyzeMyCharacterScreenshot(formData));
      } catch {
        setResult({ ok: false, error: "No se pudo subir la captura. Vuelve a intentar." });
      }
    });
  }

  const matches = result?.ok === true && typedPower === result.power;

  return (
    <div ref={containerRef} className="mt-5 rounded-[10px] border border-border bg-background-elevated p-4">
      <p className="text-sm font-semibold text-foreground">Captura de tu personaje (obligatoria)</p>
      <p className="mt-0.5 text-xs text-muted">
        Sirve para comprobar tu Power. Abre la ventana «Character / Personaje» del juego, pestaña básica, y sube la
        captura completa: el Power que se lea tiene que ser el mismo que escribiste arriba. Sirve en español, portugués
        o inglés. La imagen solo se analiza y se descarta, no queda guardada.
      </p>

      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-surface-hover">
        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />}
        {isAnalyzing ? "Analizando…" : result?.ok ? "Subir otra captura" : "Subir captura"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={isAnalyzing}
          onChange={(event) => {
            analyze(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>

      {isAnalyzing && <p className="mt-2 text-xs text-muted">Leyendo la captura, puede tardar unos 10 segundos…</p>}

      {result && !result.ok && (
        <p role="alert" className="mt-3 rounded-[10px] border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {result.error}
        </p>
      )}

      {result?.ok && (
        <>
          <p role="status" className="mt-3 flex items-start gap-2 text-sm">
            {matches ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span className={matches ? "text-emerald-400" : "text-rose-400"}>
              {matches
                ? `Power ${POWER_FORMATTER.format(result.power)} comprobado: coincide con la captura.`
                : typedPower === null
                  ? `En la captura se lee Power ${POWER_FORMATTER.format(result.power)}. Escríbelo arriba en «Poder».`
                  : `El Power que escribiste (${POWER_FORMATTER.format(typedPower)}) no coincide con el de la captura (${POWER_FORMATTER.format(result.power)}).`}
            </span>
          </p>
          {!matches && (
            <button
              type="button"
              onClick={() => applyScreenshotPower(result.power)}
              className="mt-2 text-xs font-semibold text-accent hover:underline"
            >
              Usar {POWER_FORMATTER.format(result.power)}
            </button>
          )}
          <input type="hidden" name="screenshotProof" value={result.proof} />
        </>
      )}

      <button
        type="submit"
        disabled={!matches || isAnalyzing}
        className="btn-brand mt-4 block px-4 py-2 text-sm disabled:opacity-50"
      >
        Enviar a validación
      </button>
      {!matches && (
        <p className="mt-1 text-xs text-muted">
          {result?.ok ? "El Power tiene que coincidir con la captura para poder enviar." : "Sube la captura para poder enviar."}
        </p>
      )}
    </div>
  );
}
