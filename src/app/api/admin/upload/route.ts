import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

// Protegida por proxy.ts (matcher /api/admin/:path*), requiere sesión de admin.
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
  }

  const MAX_BYTES = 4 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen no puede superar los 4 MB." }, { status: 400 });
  }

  try {
    // El store original (BLOB_READ_WRITE_TOKEN) quedó creado como Private y
    // no admite `access: "public"` — las imágenes de equipamiento necesitan
    // URLs públicas estables, así que se suben al store nuevo (Public).
    const blob = await put(`equipamiento/${crypto.randomUUID()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.PUBLIC_BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("admin/upload failed:", err);
    return NextResponse.json(
      { error: "No se pudo subir la imagen. Verifica que PUBLIC_BLOB_READ_WRITE_TOKEN esté configurado." },
      { status: 500 }
    );
  }
}
