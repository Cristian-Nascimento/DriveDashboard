import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone é para o Docker; a Vercel faz o próprio empacotamento.
  output: process.env.VERCEL ? undefined : "standalone",
  // a tela de maquininhas foi removida; quem tinha o endereço salvo cai em Ajustes
  async redirects() {
    return [{ source: "/maquininhas", destination: "/ajustes", permanent: false }];
  },
};

export default nextConfig;
