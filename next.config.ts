import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin esto, Next.js intenta empaquetar baileys/pino en su bundle
  // del server y rompe. Estos paquetes son nativos y deben quedarse externos.
  serverExternalPackages: ["@whiskeysockets/baileys", "pino", "pino-pretty"],
};

export default nextConfig;
