import type { NextConfig } from "next";

const emDesenvolvimento = process.env.NODE_ENV === "development";

/**
 * Content Security Policy sem nonce (ver node_modules/next/dist/docs/01-app/
 * 02-guides/content-security-policy.md, seção "Without Nonces").
 *
 * - script-src precisa de 'unsafe-inline' para os scripts inline que o Next
 *   injeta na página e para o JSON-LD do layout; 'unsafe-eval' só em dev
 *   (o React usa eval para reconstruir stacks de erro — não em produção).
 * - connect-src libera a ViaCEP, que o navegador consulta para autocompletar
 *   o endereço a partir do CEP.
 * - font-src 'self': next/font baixa as fontes do Google no build e as serve
 *   do próprio domínio.
 */
const politicaDeConteudo = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://viacep.com.br",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const cabecalhosDeSeguranca = [
  { key: "Content-Security-Policy", value: politicaDeConteudo },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Redundante com frame-ancestors 'none', mas cobre navegadores antigos.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Navegadores ignoram HSTS recebido por HTTP, então não atrapalha o localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Não anuncia "X-Powered-By: Next.js" nas respostas.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: cabecalhosDeSeguranca,
      },
    ];
  },
};

export default nextConfig;
