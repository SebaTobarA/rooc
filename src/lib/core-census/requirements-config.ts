/**
 * Mínimos vigentes de la ficha Core, tal como los configuraron los oficiales
 * en /admin/requisitos-core (CoreRequirementSettings, fila única). Vive
 * aparte de requirements.ts porque ese archivo es puro y lo importan
 * componentes de cliente; este pega a la base.
 */

import { prisma } from "@/lib/prisma";
import { applyRequirementOverrides, type RequirementOverrides, type SheetRequirement } from "./requirements";

export async function loadSheetRequirements(): Promise<SheetRequirement[]> {
  const settings = await prisma.coreRequirementSettings.findFirst();
  return applyRequirementOverrides((settings?.mins as RequirementOverrides | undefined) ?? {});
}
