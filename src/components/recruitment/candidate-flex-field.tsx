"use client";

import { useState } from "react";

const FIELD_CLASS =
  "mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground";

/**
 * "Flexibilidad de cambio de clase": si responde que sí, se marcan las clases
 * a las que podría cambiarse.
 */
export function CandidateFlexField({
  flexible,
  selected,
  jobs,
}: {
  flexible: boolean | null;
  selected: string[];
  jobs: readonly string[];
}) {
  const [answer, setAnswer] = useState(flexible === null ? "" : flexible ? "yes" : "no");

  return (
    <div>
      <label className="block text-xs text-muted">
        Flexibilidad de cambio de clase
        <select name="classFlexible" value={answer} onChange={(e) => setAnswer(e.target.value)} className={FIELD_CLASS}>
          <option value="">Sin preguntar</option>
          <option value="yes">Sí, puede cambiar</option>
          <option value="no">No</option>
        </select>
      </label>
      {answer === "yes" && (
        <fieldset className="mt-2">
          <legend className="text-xs text-muted">Puede cambiar a</legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {jobs.map((job) => (
              <label
                key={job}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-foreground has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
              >
                <input
                  type="checkbox"
                  name="flexibleJobs"
                  value={job}
                  defaultChecked={selected.includes(job)}
                  className="sr-only"
                />
                {job}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
