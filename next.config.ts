import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
