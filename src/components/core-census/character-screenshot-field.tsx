"use client";

import { useRef, useState, useTransition } from "react";
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

function Check({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      )}
      <span>
        <span className="font-semibold text-foreground">{label}:</span> <span className="text-muted">{detail}</span>
      </span>
    </li>
  );
}

/**
 * Paso obligatorio de /panel/ficha: el jugador sube la captura de la ventana
 * "Character" del juego (en español, portugués o inglés) y se lee su job,
 * nombre y Power. El Power leído reemplaza el del formulario, y el botón de
 * enviar recién se habilita con una captura analizada. La imagen no se guarda.
 */
export function CharacterScreenshotField() {
  const [result, setResult] = useState<ScreenshotAnalysis | null>(null);
  const [isAnalyzing, startAnalyzing] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  function analyze(file: File | undefined) {
    if (!file) return;
    setResult(null);
    startAnalyzing(async () => {
      try {
        const formData = new FormData();
        formData.set("screenshot", await shrink(file), "captura.jpg");
        const analysis = await analyzeMyCharacterScreenshot(formData);
        setResult(analysis);
        // El Power del formulario pasa a ser el leído en la captura.
        const power = containerRef.current?.closest("form")?.elements.namedItem("power");
        if (analysis.ok && power instanceof HTMLInputElement && analysis.power !== null) {
          power.value = String(analysis.power);
          power.readOnly = true;
        }
      } catch {
        setResult({ ok: false, error: "No se pudo subir la captura. Vuelve a intentar." });
      }
    });
  }

  return (
    <div ref={containerRef} className="mt-5 rounded-[10px] border border-border bg-background-elevated p-4">
      <p className="text-sm font-semibold text-foreground">Captura de tu personaje (obligatoria)</p>
      <p className="mt-0.5 text-xs text-muted">
        Abre la ventana «Character / Personaje» del juego, pestaña básica, y sube la captura completa: se confirman tu
        job, tu nombre y tu Power. Sirve en español, portugués o inglés. La imagen solo se analiza y se descarta, no
        queda guardada.
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
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            <Check
              ok={result.jobMatches}
              label="Job"
              detail={
                result.jobMatches
                  ? `${result.job} (coincide con tu ficha)`
                  : `en la captura dice «${result.jobAsShown ?? "no se lee"}»; tu ficha dice «${result.expectedJob ?? "sin job"}»`
              }
            />
            <Check
              ok={result.nameMatches}
              label="Nombre"
              detail={
                result.nameMatches
                  ? `${result.characterName} (coincide con tu ficha)`
                  : `no se encontró «${result.expectedName}» (el nombre de tu ficha) en la captura`
              }
            />
            <Check
              ok
              label="Power"
              detail={`${POWER_FORMATTER.format(result.power ?? 0)} (se usa este valor en tu actualización)`}
            />
          </ul>
          {(!result.jobMatches || !result.nameMatches) && (
            <p className="mt-2 text-xs text-amber-400">
              Puedes enviarla igual: el moderador verá la diferencia al validarla. Si cambiaste de job o de nombre,
              explícalo en el comentario.
            </p>
          )}
          <input type="hidden" name="screenshotProof" value={result.proof} />
        </>
      )}

      <button
        type="submit"
        disabled={!result?.ok || isAnalyzing}
        className="btn-brand mt-4 block px-4 py-2 text-sm disabled:opacity-50"
      >
        Enviar a validación
      </button>
      {!result?.ok && <p className="mt-1 text-xs text-muted">Sube la captura para poder enviar.</p>}
    </div>
  );
}
