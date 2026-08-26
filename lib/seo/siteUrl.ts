/**
 * URL pública do site, usada em metadados (Open Graph, canonical, sitemap).
 * Prioriza NEXT_PUBLIC_SITE_URL (setar assim que o domínio final existir);
 * cai para o domínio automático da Vercel (VERCEL_URL) e, em dev, localhost.
 */
export function obterUrlSite(): string {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada) return configurada.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}
