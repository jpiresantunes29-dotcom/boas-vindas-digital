import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { obterUrlSite } from "@/lib/seo/siteUrl";

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

const TITULO = "Seja bem-vindo(a) | Aliança Cristã Curitiba";
const DESCRICAO =
  "Cadastro digital de visitantes da Aliança Cristã Curitiba — leva menos de 2 minutos. Deixe seus dados e nossa equipe entra em contato para o primeiro café.";

export const metadata: Metadata = {
  metadataBase: new URL(obterUrlSite()),
  title: {
    default: TITULO,
    template: "%s | Aliança Cristã Curitiba",
  },
  description: DESCRICAO,
  keywords: [
    "Aliança Cristã Curitiba",
    "igreja em Curitiba",
    "igreja Cidade Industrial de Curitiba",
    "cadastro de visitantes",
    "primeira visita igreja",
    "culto Curitiba",
  ],
  authors: [{ name: "Aliança Cristã Curitiba" }],
  applicationName: "Aliança Cristã Curitiba",
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
    siteName: "Aliança Cristã Curitiba",
    title: TITULO,
    description: DESCRICAO,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aliança Cristã Curitiba",
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
    name: "Aliança Cristã Curitiba",
    url,
    logo: `${url}/logo-alianca-crista.png`,
    image: `${url}/og-image.png`,
    telephone: "+5541997479889",
    address: {
      "@type": "PostalAddress",
      streetAddress: "R. Dep. Cunha Bueno, 352",
      addressLocality: "Curitiba",
      addressRegion: "PR",
      addressCountry: "BR",
    },
    sameAs: ["https://www.instagram.com/aliancacristacuritiba"],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Wednesday",
        opens: "20:00",
        description: "Culto TOPP",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "19:00",
        description: "Culto da Família",
      },
    ],
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdIgreja()) }}
        />
        {children}
      </body>
    </html>
  );
}
