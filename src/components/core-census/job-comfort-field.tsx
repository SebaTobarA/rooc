"use client";

import { useState } from "react";

const FIELD_CLASS =
  "mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

interface JobComfortFieldProps {
  /** null = todavía no se le preguntó. */
  comfortable: boolean | null;
  desiredJob: string | null;
  jobs: readonly string[];
}

/**
 * Pregunta de la ficha "¿Se siente cómod@ con el job que juega?". El
 * desplegable del job deseado solo aparece (y solo se envía) si la respuesta
 * es "No".
 */
export function JobComfortField({ comfortable, desiredJob, jobs }: JobComfortFieldProps) {
  const [answer, setAnswer] = useState(comfortable === null ? "" : comfortable ? "yes" : "no");

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block text-xs text-muted sm:col-span-2">
        ¿Se siente cómod@ con el job que juega?
        <select name="comfortableWithJob" value={answer} onChange={(e) => setAnswer(e.target.value)} className={FIELD_CLASS}>
          <option value="">Sin preguntar</option>
          <option value="yes">Sí</option>
          <option value="no">No</option>
        </select>
      </label>

      {answer === "no" && (
        <label className="block text-xs text-muted sm:col-span-2">
          Job que desea jugar
          <select name="desiredJob" defaultValue={desiredJob ?? ""} className={FIELD_CLASS}>
            <option value="">Sin definir</option>
            {jobs.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
