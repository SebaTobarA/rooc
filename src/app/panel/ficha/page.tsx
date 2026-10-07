import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitMySheetUpdate } from "@/lib/actions/core-census";
import { loadSheetRequirements } from "@/lib/core-census/requirements-config";
import { BackLink } from "@/components/back-link";
import { SheetFields } from "@/components/core-census/sheet-fields";
import { SubmissionHistory } from "@/components/core-census/submission-history";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Actualizar mi ficha",
};

/**
 * Donde el propio jugador [SD] Core reporta los datos de su personaje. Lo que
 * envía no cambia su ficha: queda pendiente hasta que un moderador lo valida
 * desde /admin/evaluacion-core (ver reviewSheetSubmission).
 */
export default async function UpdateMySheetPage({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const { enviado } = await searchParams;
  const session = await getSession();
  const sheet = session?.discordId
    ? await prisma.coreCharacterSheet.findUnique({ where: { discordId: session.discordId } })
    : null;

  if (!session?.discordId || !sheet?.inCore) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <BackLink href="/panel" label="Inicio" />
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-semibold text-foreground">Esta ficha es para miembros [SD] Core</p>
          <p className="mt-1 text-sm text-muted">
            Si ya tienes el rol y ves este mensaje, pídele a un oficial que abra Evaluación de CORE para que se cree
            tu ficha.
          </p>
        </div>
      </div>
    );
  }

  const [requirements, submissions] = await Promise.all([
    loadSheetRequirements(),
    prisma.coreSheetSubmission.findMany({
      where: { discordId: session.discordId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const pending = submissions.find((submission) => submission.status === "PENDING") ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BackLink href="/panel" label="Inicio" />
      <h1 className="text-xl font-bold text-foreground">Actualizar mi ficha Core</h1>
      <p className="mt-1 text-sm text-muted">
        Carga los datos actuales de tu personaje. No se aplican al instante: un moderador los revisa y, cuando los
        valida, pasan a tu ficha.
      </p>

      {enviado && (
        <p className="mt-4 rounded-[10px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Actualización enviada. Queda pendiente hasta que un moderador la valide.
        </p>
      )}

      {pending && !enviado && (
        <p className="mt-4 rounded-[10px] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          Ya tienes una actualización pendiente de validación. Si envías otra, reemplaza a la anterior.
        </p>
      )}

      <form action={submitMySheetUpdate} className="mt-5 rounded-xl border border-border bg-surface p-5">
        {/* Se precarga con lo último que reportó (si sigue pendiente) o con su ficha vigente. */}
        <SheetFields requirements={requirements} values={pending ?? sheet} />

        <label className="mt-4 block text-xs text-muted">
          Comentario para el moderador (opcional)
          <textarea
            name="note"
            rows={2}
            maxLength={300}
            defaultValue={pending?.note ?? ""}
            className="mt-1 block w-full rounded-[10px] border border-border bg-background-elevated px-3 py-2 text-sm text-foreground"
          />
        </label>

        <button type="submit" className="btn-brand mt-4 px-4 py-2 text-sm">
          Enviar a validación
        </button>
      </form>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-foreground">Historial de actualizaciones</h2>
        <SubmissionHistory submissions={submissions} requirements={requirements} />
      </section>
    </div>
  );
}
