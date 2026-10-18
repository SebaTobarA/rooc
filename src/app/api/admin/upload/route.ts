import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { validateImageUpload } from "@/lib/upload-validation";

// Protegida por proxy.ts (matcher /api/admin/:path*); el admin se revalida
// acá también por si el matcher cambia algún día.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  const invalid = await validateImageUpload(file, 4 * 1024 * 1024);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  try {
    // El store original (BLOB_READ_WRITE_TOKEN) quedó creado como Private y
    // no admite `access: "public"` — las imágenes de equipamiento necesitan
    // URLs públicas estables, así que se suben al store nuevo (Public).
    const blob = await put(`equipamiento/${crypto.randomUUID()}`, file, {
      contentType: file.type,
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
