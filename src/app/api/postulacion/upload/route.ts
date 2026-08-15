import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SCREENSHOT_MAX_BYTES } from "@/lib/recruitment-screenshots";

/**
 * Subida de las capturas del formulario de postulación. A diferencia de
 * /api/admin/upload (solo admins, protegida por proxy.ts), esta la usa el
 * postulante, así que alcanza con una sesión de Discord válida — pero como
 * el matcher de proxy.ts no cubre /api/postulacion/*, la sesión se verifica
 * acá adentro.
 *
 * Una imagen por petición: así cada request queda muy por debajo del límite
 * de 4.5 MB que Vercel impone al cuerpo de las peticiones.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.discordId) {
    return NextResponse.json({ error: "Necesitas haber iniciado sesión con Discord." }, { status: 401 });
  }

  // Quien ya tiene postulación no puede seguir subiendo archivos: el
  // formulario ya no se le muestra, y esto cierra la puerta de atrás.
  const existing = await prisma.guildApplication.findUnique({
    where: { discordId: session.discordId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya enviaste tu postulación." }, { status: 409 });
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
    // Mismo store público que las imágenes de equipamiento (el store original
    // quedó creado como Private y no admite `access: "public"`). El nombre
    // lleva el discordId para poder rastrear a quién pertenece cada archivo,
    // más un UUID que hace la URL imposible de adivinar.
    const blob = await put(
      `postulaciones/${session.discordId}/${crypto.randomUUID()}`,
      file,
      {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type,
        token: process.env.PUBLIC_BLOB_READ_WRITE_TOKEN,
      }
    );
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("postulacion/upload failed:", err);
    return NextResponse.json(
      { error: "No se pudo subir la captura. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
