"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { JobTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function revalidateSkillTreePaths() {
  revalidatePath("/admin/build-pvp");
  revalidatePath("/panel/build-pvp");
}

// --- Job (clase: 1st / 2nd / Trans. 2nd) ------------------------------------

const jobSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  parentId: z.string().optional(),
  order: z.coerce.number().int().default(0),
  iconUrl: z.string().optional(),
  portraitUrl: z.string().optional(),
});

function parseJobForm(formData: FormData) {
  return jobSchema.parse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || undefined,
    order: formData.get("order") || 0,
    iconUrl: formData.get("iconUrl") || undefined,
    portraitUrl: formData.get("portraitUrl") || undefined,
  });
}

/** El tier se deriva del padre: sin padre es 1st, y cada hijo sube un escalón (tope en Trans. 2nd). */
async function resolveChildTier(parentId?: string): Promise<JobTier> {
  if (!parentId) return "FIRST";
  const parent = await prisma.job.findUniqueOrThrow({ where: { id: parentId } });
  if (parent.tier === "FIRST") return "SECOND";
  return "TRANSCENDENT";
}

export async function createJob(formData: FormData) {
  const data = parseJobForm(formData);
  const tier = await resolveChildTier(data.parentId);
  if (tier === "TRANSCENDENT") {
    const parent = await prisma.job.findUniqueOrThrow({ where: { id: data.parentId! } });
    if (parent.tier === "TRANSCENDENT") {
      throw new Error("Trans. 2nd es el último escalón — no se pueden agregar clases debajo.");
    }
  }

  await prisma.job.create({
    data: {
      name: data.name,
      tier,
      order: data.order,
      parentId: data.parentId ?? null,
      iconUrl: data.iconUrl,
      portraitUrl: data.portraitUrl,
    },
  });

  revalidateSkillTreePaths();
}

export async function updateJob(id: string, formData: FormData) {
  const data = parseJobForm(formData);

  await prisma.job.update({
    where: { id },
    data: {
      name: data.name,
      order: data.order,
      iconUrl: data.iconUrl,
      portraitUrl: data.portraitUrl,
    },
  });

  revalidateSkillTreePaths();
}

export async function deleteJob(id: string) {
  await prisma.job.delete({ where: { id } });
  revalidateSkillTreePaths();
  redirect("/admin/build-pvp");
}

// --- Skill -------------------------------------------------------------

const skillSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  iconUrl: z.string().optional(),
  maxLevel: z.coerce.number().int().min(1).max(20),
  col: z.coerce.number().int().default(0),
  row: z.coerce.number().int().default(0),
});

function parseSkillForm(formData: FormData) {
  const data = skillSchema.parse({
    name: formData.get("name"),
    iconUrl: formData.get("iconUrl") || undefined,
    maxLevel: formData.get("maxLevel") || 10,
    col: formData.get("col") || 0,
    row: formData.get("row") || 0,
  });

  // Un textarea "levelDesc-N" por cada nivel (1..maxLevel), cargados dinámicamente
  // en el form según maxLevel — ver SkillForm.
  const levelDescriptions = Array.from({ length: data.maxLevel }, (_, i) =>
    String(formData.get(`levelDesc-${i + 1}`) ?? "").trim()
  );

  return { ...data, levelDescriptions };
}

export async function createSkill(jobId: string, formData: FormData) {
  const data = parseSkillForm(formData);

  await prisma.skill.create({
    data: { ...data, jobId },
  });

  revalidateSkillTreePaths();
  redirect(`/admin/build-pvp/${jobId}`);
}

export async function updateSkill(id: string, jobId: string, formData: FormData) {
  const data = parseSkillForm(formData);

  await prisma.skill.update({
    where: { id },
    data,
  });

  revalidateSkillTreePaths();
  redirect(`/admin/build-pvp/${jobId}`);
}

export async function deleteSkill(id: string, jobId: string) {
  await prisma.skill.delete({ where: { id } });
  revalidateSkillTreePaths();
  redirect(`/admin/build-pvp/${jobId}`);
}

/**
 * Reemplaza de una vez todos los prerequisitos de una skill — más simple
 * que agregar/quitar de a uno desde un checklist. `formData` trae
 * `prereq-<otherSkillId>` = "on" para las tildadas y `prereqLevel-<otherSkillId>`
 * con el nivel requerido de cada una.
 */
export async function setSkillPrerequisites(skillId: string, jobId: string, formData: FormData) {
  const entries: { requiresSkillId: string; requiredLevel: number }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("prereq-") || value !== "on") continue;
    const requiresSkillId = key.slice("prereq-".length);
    const levelRaw = formData.get(`prereqLevel-${requiresSkillId}`);
    const requiredLevel = Math.max(1, Number(levelRaw) || 1);
    entries.push({ requiresSkillId, requiredLevel });
  }

  await prisma.$transaction([
    prisma.skillPrerequisite.deleteMany({ where: { skillId } }),
    ...entries.map((entry) =>
      prisma.skillPrerequisite.create({
        data: { skillId, requiresSkillId: entry.requiresSkillId, requiredLevel: entry.requiredLevel },
      })
    ),
  ]);

  revalidateSkillTreePaths();
  redirect(`/admin/build-pvp/${jobId}`);
}
