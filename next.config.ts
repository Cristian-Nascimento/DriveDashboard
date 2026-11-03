import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone é para o Docker; a Vercel faz o próprio empacotamento.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
