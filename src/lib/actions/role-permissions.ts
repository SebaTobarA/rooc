"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateRolePermission(
  discordRoleId: string,
  roleName: string,
  formData: FormData
) {
  await prisma.rolePermission.upsert({
    where: { discordRoleId },
    create: {
      discordRoleId,
      roleName,
      canViewPanel: formData.get("canViewPanel") === "on",
      canViewParty: formData.get("canViewParty") === "on",
      canManageParty: formData.get("canManageParty") === "on",
      canManageContent: formData.get("canManageContent") === "on",
    },
    update: {
      roleName,
      canViewPanel: formData.get("canViewPanel") === "on",
      canViewParty: formData.get("canViewParty") === "on",
      canManageParty: formData.get("canManageParty") === "on",
      canManageContent: formData.get("canManageContent") === "on",
    },
  });

  revalidatePath("/admin/roles");
}
