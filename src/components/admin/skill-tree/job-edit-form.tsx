import type { Job } from "@prisma/client";
import { Field, SubmitButton, inputClass } from "@/components/forms/form-fields";
import { ImageUploadField } from "@/components/forms/image-upload-field";

export function JobEditForm({
  job,
  action,
}: {
  job: Job;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Nombre">
        <input name="name" defaultValue={job.name} required className={inputClass} />
      </Field>
      <Field label="Orden" hint="Entre hermanos (columnas o ramas)">
        <input type="number" name="order" defaultValue={job.order} className={inputClass} />
      </Field>
      <Field label="Ícono">
        <ImageUploadField name="iconUrl" defaultValue={job.iconUrl ?? ""} />
      </Field>
      {job.tier === "TRANSCENDENT" && (
        <Field label="Retrato" hint="Se muestra en la tarjeta de personaje del simulador">
          <ImageUploadField name="portraitUrl" defaultValue={job.portraitUrl ?? ""} />
        </Field>
      )}
      <div className="sm:col-span-2">
        <SubmitButton>Guardar clase</SubmitButton>
      </div>
    </form>
  );
}
