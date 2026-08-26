import { z } from "zod";

export const SEXO_OPCOES = ["masculino", "feminino"] as const;

export const ESTADO_CIVIL_OPCOES = [
  "solteiro",
  "namorando",
  "casado",
  "viuvo",
  "divorciado",
] as const;

export const COMO_CONHECEU_OPCOES = [
  "redes_sociais",
  "convite",
  "internet",
  "outro",
] as const;

export const TIPO_MORADIA_OPCOES = ["casa", "apartamento", "condominio"] as const;

export const TIPO_MORADIA_ROTULOS: Record<(typeof TIPO_MORADIA_OPCOES)[number], string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  condominio: "Condomínio",
};

export const ESTADO_CIVIL_ROTULOS: Record<(typeof ESTADO_CIVIL_OPCOES)[number], string> = {
  solteiro: "Solteiro(a)",
  namorando: "Namorando",
  casado: "Casado(a)",
  viuvo: "Viúvo(a)",
  divorciado: "Divorciado(a)",
};

export const COMO_CONHECEU_ROTULOS: Record<(typeof COMO_CONHECEU_OPCOES)[number], string> = {
  redes_sociais: "Redes sociais",
  convite: "Convite",
  internet: "Internet",
  outro: "Outro",
};

/** Remove tudo que não é dígito e descarta o DDI 55 quando presente. */
export function normalizarCelular(valor: string): string {
  const somenteDigitos = valor.replace(/\D/g, "");
  if (somenteDigitos.length >= 12 && somenteDigitos.startsWith("55")) {
    return somenteDigitos.slice(2);
  }
  return somenteDigitos;
}

const celularSchema = z
  .string()
  .min(1, "Informe o seu celular.")
  .transform(normalizarCelular)
  .refine((v) => v.length === 10 || v.length === 11, {
    message: "Confira o número — parece faltar ou sobrar um dígito.",
  })
  .refine((v) => /^[1-9][0-9]/.test(v), {
    message: "Confira o DDD informado.",
  });

/**
 * Grupos de rádio sem nenhuma opção marcada chegam ao resolver como string
 * vazia, não como `undefined` — este helper trata "" como "não respondido"
 * antes de validar contra o enum, para o campo continuar opcional de fato.
 */
function enumOpcional<T extends readonly [string, ...string[]]>(opcoes: T) {
  return z.preprocess(
    (valor) => (valor === "" || valor === null ? undefined : valor),
    z.enum(opcoes).optional()
  );
}

const dataNascimentoSchema = z
  .string()
  .min(1, "Informe sua data de nascimento.")
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Data inválida." })
  .refine((v) => new Date(v).getTime() <= Date.now(), {
    message: "A data de nascimento não pode ser no futuro.",
  });

const cepSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{8}$/.test(v.replace(/\D/g, "")), {
    message: "CEP deve ter 8 dígitos.",
  })
  .optional();

export const visitanteSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, "Informe seu nome completo.")
      .max(120, "Nome muito longo."),
    celular: celularSchema,
    email: z
      .union([z.literal(""), z.string().trim().email("Informe um e-mail válido.")])
      .optional(),
    sexo: enumOpcional(SEXO_OPCOES),
    estadoCivil: enumOpcional(ESTADO_CIVIL_OPCOES),
    dataNascimento: dataNascimentoSchema,
    cep: cepSchema,
    endereco: z
      .string()
      .trim()
      .min(3, "Informe seu endereço.")
      .max(200, "Endereço muito longo."),
    numero: z
      .string()
      .trim()
      .min(1, "Informe o número.")
      .max(20, "Número muito longo."),
    complemento: z.string().trim().max(120).optional(),
    tipoMoradia: enumOpcional(TIPO_MORADIA_OPCOES),
    bairro: z.string().trim().max(120).optional(),
    cidade: z.string().trim().max(120).optional(),
    comoConheceu: enumOpcional(COMO_CONHECEU_OPCOES),
    convidadoPor: z.string().trim().max(160).optional(),
    outraIgreja: z.string().trim().max(160).optional(),
    desejaSeUnir: z.boolean().default(false),
    desejaReceberVisita: z.boolean().default(false),
    pedidoOracao: z.string().trim().max(1000, "Pedido muito longo.").optional(),
    /** Honeypot: campo invisível ao visitante humano — se vier preenchido, é bot. */
    empresa: z.string().max(0).optional().default(""),
  })
  .refine((dados) => dados.desejaSeUnir || dados.desejaReceberVisita, {
    message: "Marque pelo menos uma opção.",
    path: ["desejaSeUnir"],
  })
  .refine((dados) => dados.comoConheceu !== "convite" || !!dados.convidadoPor?.trim(), {
    message: "Informe quem te convidou.",
    path: ["convidadoPor"],
  });

export type VisitanteInput = z.input<typeof visitanteSchema>;
export type VisitanteValidado = z.output<typeof visitanteSchema>;
