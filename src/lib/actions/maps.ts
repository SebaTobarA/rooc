"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const mapSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  region: z.string().min(1, "La región es obligatoria"),
  description: z.string().default(""),
});

function parseMapForm(formData: FormData) {
  return mapSchema.parse({
    name: formData.get("name"),
    region: formData.get("region"),
    description: formData.get("description") ?? "",
  });
}

function revalidateMapPaths(slug?: string) {
  revalidatePath("/panel/maps");
  revalidatePath("/admin/maps");
  if (slug) revalidatePath(`/panel/maps/${slug}`);
}

export async function createMap(formData: FormData) {
  const data = parseMapForm(formData);
  const slug = slugify(data.name);

  const map = await prisma.gameMap.create({
    data: { ...data, slug, isPlaceholder: false },
  });

  revalidateMapPaths(slug);
  redirect(`/admin/maps/${map.id}/edit`);
}

export async function updateMap(id: string, formData: FormData) {
  const data = parseMapForm(formData);
  const existing = await prisma.gameMap.findUniqueOrThrow({ where: { id } });
  const slug = data.name === existing.name ? existing.slug : slugify(data.name);

  await prisma.gameMap.update({ where: { id }, data: { ...data, slug } });

  revalidateMapPaths(existing.slug);
  revalidateMapPaths(slug);
  redirect("/admin/maps");
}

export async function deleteMap(id: string) {
  const existing = await prisma.gameMap.delete({ where: { id } });
  revalidateMapPaths(existing.slug);
  redirect("/admin/maps");
}

// --- NPCs ------------------------------------------------------------------

const npcSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  role: z.string().default(""),
});

export async function addNpc(mapId: string, formData: FormData) {
  const data = npcSchema.parse({
    name: formData.get("name"),
    role: formData.get("role") ?? "",
  });

  await prisma.npc.create({ data: { ...data, mapId } });

  const map = await prisma.gameMap.findUnique({ where: { id: mapId } });
  revalidateMapPaths(map?.slug);
}

export async function deleteNpc(npcId: string) {
  const npc = await prisma.npc.delete({ where: { id: npcId } });
  const map = await prisma.gameMap.findUnique({ where: { id: npc.mapId } });
  revalidateMapPaths(map?.slug);
}
