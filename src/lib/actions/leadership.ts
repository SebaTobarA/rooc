"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function revalidateLeadershipPaths() {
  revalidatePath("/admin/leadership");
  revalidatePath("/");
}

export async function createPosition(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const last = await prisma.leadershipPosition.findFirst({ orderBy: { order: "desc" } });
  await prisma.leadershipPosition.create({
    data: { title, order: (last?.order ?? 0) + 1 },
  });

  revalidateLeadershipPaths();
}

export async function updatePositionTitle(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  await prisma.leadershipPosition.update({ where: { id }, data: { title } });
  revalidateLeadershipPaths();
}

export async function deletePosition(id: string) {
  await prisma.leadershipPosition.delete({ where: { id } });
  revalidateLeadershipPaths();
}

export async function movePosition(id: string, direction: "up" | "down") {
  const positions = await prisma.leadershipPosition.findMany({ orderBy: { order: "asc" } });
  const index = positions.findIndex((p) => p.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= positions.length) return;

  const current = positions[index];
  const neighbor = positions[swapIndex];

  await prisma.$transaction([
    prisma.leadershipPosition.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    prisma.leadershipPosition.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  revalidateLeadershipPaths();
}

export async function addMemberToPosition(positionId: string, formData: FormData) {
  const discordId = String(formData.get("discordId") ?? "").trim();
  const discordUsername = String(formData.get("discordUsername") ?? "").trim();
  const discordAvatarHash = String(formData.get("discordAvatarHash") ?? "").trim() || null;
  const nickname = String(formData.get("nickname") ?? "").trim() || discordUsername;
  if (!discordId || !discordUsername) return;

  const last = await prisma.leadershipMember.findFirst({
    where: { positionId },
    orderBy: { order: "desc" },
  });

  await prisma.leadershipMember.create({
    data: {
      positionId,
      discordId,
      discordUsername,
      discordAvatarHash,
      nickname,
      order: (last?.order ?? 0) + 1,
    },
  });

  revalidateLeadershipPaths();
}

export async function updateMemberNickname(memberId: string, formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!nickname) return;

  await prisma.leadershipMember.update({ where: { id: memberId }, data: { nickname } });
  revalidateLeadershipPaths();
}

export async function removeMember(memberId: string) {
  await prisma.leadershipMember.delete({ where: { id: memberId } });
  revalidateLeadershipPaths();
}
