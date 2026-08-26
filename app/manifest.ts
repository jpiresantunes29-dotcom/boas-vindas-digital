import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aliança Cristã Curitiba — Cadastro de Visitantes",
    short_name: "Aliança Cristã",
    description: "Cadastro digital de visitantes da Aliança Cristã Curitiba.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f0",
    theme_color: "#16213e",
    lang: "pt-BR",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
