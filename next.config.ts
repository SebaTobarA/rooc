import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Política de contenido: el navegador solo carga scripts, estilos e iframes
// de este mismo sitio más los servicios que usa de verdad (avatares de
// Discord, miniaturas y videos de YouTube, imágenes del blob, la API de
// GitHub del planificador de ligas y el contador de conectados del invite de
// Discord). Si alguien lograra inyectar HTML, no podría cargar un script de
// otro dominio ni mandar datos a un servidor ajeno. 'unsafe-inline' en
// scripts lo necesita Next para hidratar sin nonce.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.discordapp.com https://i.ytimg.com https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.github.com https://discord.com/api/v10/invites/",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "media-src 'self' https://*.public.blob.vercel-storage.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Solo HTTPS durante 2 años, también en subdominios.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Ningún otro sitio puede mostrar estas páginas dentro de un iframe (evita
  // que una copia falsa "envuelva" el panel real para robar clics).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // rooc-tactics se sirve compilado desde public/tacticas (npm run
  // build:tactics); Next no sirve el index.html de una carpeta por sí solo.
  async rewrites() {
    return [
      { source: "/tacticas", destination: "/tacticas/index.html" },
      { source: "/tacticas/", destination: "/tacticas/index.html" },
    ];
  },
  images: {
    // Los íconos subidos desde /admin (equipamiento, skills, etc.) quedan
    // alojados en Vercel Blob — cada store tiene un subdominio random propio,
    // así que se permite el hostname genérico en vez de uno fijo.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
