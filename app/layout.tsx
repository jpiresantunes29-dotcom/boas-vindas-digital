import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { obterUrlSite } from "@/lib/seo/siteUrl";
import { IGREJA } from "@/lib/config/igreja";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const TITULO = `Seja bem-vindo(a) | ${IGREJA.nome}`;
const DESCRICAO = `Cadastro digital de visitantes da ${IGREJA.nome} — leva menos de 2 minutos. Deixe seus dados e nossa equipe entra em contato para o primeiro café.`;

export const metadata: Metadata = {
  metadataBase: new URL(obterUrlSite()),
  title: {
    default: TITULO,
    template: `%s | ${IGREJA.nome}`,
  },
  description: DESCRICAO,
  keywords: [
    IGREJA.nome,
    `igreja em ${IGREJA.endereco.cidade}`,
    `igreja ${IGREJA.endereco.bairro}`,
    "cadastro de visitantes",
    "primeira visita igreja",
    `culto ${IGREJA.endereco.cidade}`,
  ],
  authors: [{ name: IGREJA.nome }],
  applicationName: IGREJA.nome,
  category: "religion",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: IGREJA.nome,
    title: TITULO,
    description: DESCRICAO,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: IGREJA.nome,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16213e",
};

/**
 * Dados estruturados (schema.org/Church) — ajudam o Google a entender que
 * a página representa um templo físico com endereço, contato e horários,
 * habilitando resultados ricos e o painel de conhecimento.
 */
function jsonLdIgreja() {
  const url = obterUrlSite();
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    name: IGREJA.nome,
    url,
    logo: `${url}/logo-alianca-crista.png`,
    image: `${url}/og-image.png`,
    telephone: `+${IGREJA.telefonePrincipal}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: IGREJA.endereco.logradouro,
      addressLocality: IGREJA.endereco.cidade,
      addressRegion: IGREJA.endereco.estado,
      addressCountry: IGREJA.endereco.pais,
    },
    sameAs: [IGREJA.instagram.url],
    openingHoursSpecification: IGREJA.cultos.map((culto) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: culto.diaSchemaOrg,
      opens: culto.horario,
      description: culto.nome,
    })),
  };
}

/**
 * Serializa o JSON-LD para dentro de um <script>. Escapar "<" impede que um
 * valor contendo "</script>" feche a tag antes da hora e injete HTML.
 */
function serializarJsonLd(dados: unknown): string {
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializarJsonLd(jsonLdIgreja()) }}
        />
        {children}
      </body>
    </html>
  );
}
