"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateRolePermission(
  discordRoleId: string,
  roleName: string,
  formData: FormData
) {
  const data = {
    roleName,
    canViewPanel: formData.get("canViewPanel") === "on",
    canViewParty: formData.get("canViewParty") === "on",
    canManageParty: formData.get("canManageParty") === "on",
    canManageContent: formData.get("canManageContent") === "on",
    canManageRecruitment: formData.get("canManageRecruitment") === "on",
    isApplicantRole: formData.get("isApplicantRole") === "on",
  };

  await prisma.rolePermission.upsert({
    where: { discordRoleId },
    create: { discordRoleId, ...data },
    update: data,
  });

  revalidatePath("/admin/roles");
}

/**
 * Suma un rol a la lista visible de /admin/roles (que por defecto solo
 * muestra los roles "fijos" — ver PINNED_ROLE_IDS en la página — más los
 * que ya se hayan agregado antes). Crea la fila con los valores por
 * defecto de un miembro común; si ya existía no la pisa.
 */
export async function addVisibleRole(discordRoleId: string, roleName: string) {
  const existing = await prisma.rolePermission.findUnique({ where: { discordRoleId } });
  if (existing) return;

  await prisma.rolePermission.create({
    data: {
      discordRoleId,
      roleName,
      canViewPanel: true,
      canViewParty: true,
      canManageParty: false,
      canManageContent: false,
      canManageRecruitment: false,
      isApplicantRole: false,
    },
  });

  revalidatePath("/admin/roles");
}

/**
 * Saca un rol de la lista visible (borra su fila de RolePermission, así que
 * vuelve a los valores por defecto de un miembro común si en algún momento
 * se lo vuelve a agregar). No se usa para los roles fijos — esos no tienen
 * botón de quitar en la UI.
 */
export async function removeVisibleRole(discordRoleId: string) {
  await prisma.rolePermission.delete({ where: { discordRoleId } }).catch(() => {});
  revalidatePath("/admin/roles");
}
