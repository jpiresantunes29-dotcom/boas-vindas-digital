/**
 * Dados institucionais da igreja, num único lugar.
 *
 * Telefones, endereço, horários de culto e redes sociais aparecem na tela de
 * sucesso, nos metadados de SEO (JSON-LD), na política de privacidade e nas
 * mensagens de WhatsApp. Mudou algo? Altere só aqui.
 */

export const IGREJA = {
  nome: "Aliança Cristã Curitiba",
  nomeCurto: "Aliança Cristã",

  endereco: {
    logradouro: "R. Dep. Cunha Bueno, 352",
    bairro: "Cidade Industrial de Curitiba",
    cidade: "Curitiba",
    estado: "PR",
    pais: "BR",
  },

  /** Telefone principal (formato E.164 sem o "+"), usado no JSON-LD. */
  telefonePrincipal: "5541997479889",

  whatsapp: [
    { rotulo: "47 98845-5100", numero: "5547988455100" },
    { rotulo: "41 99747-9889", numero: "5541997479889" },
  ],

  instagram: {
    usuario: "aliancacristacuritiba",
    url: "https://www.instagram.com/aliancacristacuritiba",
  },

  cultos: [
    { dia: "Quarta-feira", diaSchemaOrg: "Wednesday", horario: "20:00", rotuloHorario: "20h", nome: "Culto TOPP" },
    { dia: "Domingo", diaSchemaOrg: "Sunday", horario: "19:00", rotuloHorario: "19h", nome: "Culto da Família" },
  ],

  versiculoTema: {
    texto:
      "Há um só corpo e um só Espírito, como também fostes chamados em uma só esperança da vossa vocação; um só Senhor, uma só fé, um só batismo; um só Deus e Pai de todos, o qual é sobre todos, e por todos, e em todos.",
    referencia: "Efésios 4:4-6",
  },

  /** Fuso usado para datas/horas em mensagens geradas no servidor (Vercel roda em UTC). */
  fusoHorario: "America/Sao_Paulo",
} as const;

export function linkWhatsApp(numeroE164SemMais: string): string {
  return `https://wa.me/${numeroE164SemMais}`;
}

export function enderecoCompleto(): string {
  const e = IGREJA.endereco;
  return `${e.logradouro} — ${e.bairro}, ${e.cidade}/${e.estado}`;
}
