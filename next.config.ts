import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
