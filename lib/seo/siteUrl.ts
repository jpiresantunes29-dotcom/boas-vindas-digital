/**
 * URL pública do site, usada em metadados (Open Graph, canonical, sitemap).
 * Prioriza NEXT_PUBLIC_SITE_URL (setar assim que o domínio final existir);
 * depois o domínio estável de produção da Vercel (VERCEL_PROJECT_PRODUCTION_URL,
 * ex: boas-vindas-digital.vercel.app) — não usar VERCEL_URL aqui, que aponta
 * para a URL interna de cada deployment (com hash), não o domínio público fixo.
 * Em dev, cai para localhost.
 */
export function obterUrlSite(): string {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada) return configurada.replace(/\/+$/, "");

  const dominioProducao = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (dominioProducao) return `https://${dominioProducao}`;

  return "http://localhost:3000";
}
