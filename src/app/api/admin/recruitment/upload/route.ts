import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { SCREENSHOT_MAX_BYTES } from "@/lib/recruitment-screenshots";

/**
 * Subida de las capturas de la ficha de candidato. Vive bajo
 * /api/admin/recruitment para que proxy.ts deje pasar a quien tiene
 * canManageRecruitment sin ser admin del sitio; el permiso se revalida acá.
 */
export async function POST(request: Request) {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageRecruitment) {
    return NextResponse.json({ error: "Tu rol no puede gestionar reclutamiento." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
  }
  if (file.size > SCREENSHOT_MAX_BYTES) {
    return NextResponse.json({ error: "La captura no puede superar los 4 MB." }, { status: 400 });
  }

  try {
    const blob = await put(`postulaciones/candidatos/${crypto.randomUUID()}`, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      token: process.env.PUBLIC_BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("admin/recruitment/upload failed:", err);
    return NextResponse.json({ error: "No se pudo subir la captura. Intenta de nuevo." }, { status: 500 });
  }
}
