import { describe, expect, it } from "vitest";
import { normalizarCelular, visitanteSchema } from "@/lib/validacao/visitanteSchema";

const BASE_VALIDA = {
  nome: "Maria Souza",
  celular: "(41) 99747-9889",
  email: "",
  dataNascimento: "1990-05-20",
  endereco: "Rua das Flores",
  numero: "100",
  bairro: "",
  cidade: "",
  desejaSeUnir: true,
  desejaReceberVisita: false,
  pedidoOracao: "",
  aceitaPrivacidade: true,
  empresa: "",
};

/** Mensagens de erro do resultado, por campo (primeiro nível do path). */
function mensagensPorCampo(dados: unknown): Record<string, string[]> {
  const resultado = visitanteSchema.safeParse(dados);
  if (resultado.success) return {};
  const mensagens: Record<string, string[]> = {};
  for (const problema of resultado.error.issues) {
    const campo = String(problema.path[0] ?? "form");
    (mensagens[campo] ??= []).push(problema.message);
  }
  return mensagens;
}

describe("normalizarCelular", () => {
  it("remove tudo que não é dígito", () => {
    expect(normalizarCelular("(41) 99747-9889")).toBe("41997479889");
  });

  it("remove o DDI 55 quando presente", () => {
    expect(normalizarCelular("+55 41 99747-9889")).toBe("41997479889");
  });
});

describe("visitanteSchema", () => {
  it("aceita um cadastro válido com os campos obrigatórios preenchidos", () => {
    const resultado = visitanteSchema.safeParse(BASE_VALIDA);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.celular).toBe("41997479889");
    }
  });

  it("rejeita quando o nome está vazio", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, nome: "" });
    expect(resultado.success).toBe(false);
  });

  it("rejeita um celular com dígitos insuficientes", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, celular: "4199" });
    expect(resultado.success).toBe(false);
  });

  it("rejeita quando falta o endereço", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, endereco: "" });
    expect(resultado.success).toBe(false);
  });

  it("rejeita quando falta o número do endereço", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, numero: "" });
    expect(resultado.success).toBe(false);
  });

  it("rejeita quando falta a data de nascimento", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, dataNascimento: "" });
    expect(resultado.success).toBe(false);
  });

  it("rejeita data de nascimento no futuro", () => {
    const anoQueVem = new Date().getFullYear() + 1;
    const resultado = visitanteSchema.safeParse({
      ...BASE_VALIDA,
      dataNascimento: `${anoQueVem}-01-01`,
    });
    expect(resultado.success).toBe(false);
  });

  it('exige ao menos uma opção marcada em "gostaria de"', () => {
    const resultado = visitanteSchema.safeParse({
      ...BASE_VALIDA,
      desejaSeUnir: false,
      desejaReceberVisita: false,
    });
    expect(resultado.success).toBe(false);
  });

  it('exige quem convidou quando "como conheceu" é convite', () => {
    const resultado = visitanteSchema.safeParse({
      ...BASE_VALIDA,
      comoConheceu: "convite",
      convidadoPor: "",
    });
    expect(resultado.success).toBe(false);
  });

  it('aceita convite quando "quem convidou" é preenchido', () => {
    const resultado = visitanteSchema.safeParse({
      ...BASE_VALIDA,
      comoConheceu: "convite",
      convidadoPor: "João, (41) 90000-0000",
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita um e-mail em formato inválido", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, email: "não-é-email" });
    expect(resultado.success).toBe(false);
  });

  it("aceita e-mail em branco, por ser opcional", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, email: "" });
    expect(resultado.success).toBe(true);
  });

  it("rejeita quando o campo honeypot vem preenchido", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, empresa: "spam" });
    expect(resultado.success).toBe(false);
  });

  it("exige o consentimento com o aviso de privacidade", () => {
    expect(mensagensPorCampo({ ...BASE_VALIDA, aceitaPrivacidade: false }).aceitaPrivacidade).toEqual([
      "Para enviar, confirme que leu e concorda com o aviso de privacidade.",
    ]);

    const semCampo: Record<string, unknown> = { ...BASE_VALIDA };
    delete semCampo.aceitaPrivacidade;
    expect(visitanteSchema.safeParse(semCampo).success).toBe(false);
  });

  it("deixa aceitaWhatsApp como false quando não é informado (opt-in)", () => {
    const resultado = visitanteSchema.safeParse(BASE_VALIDA);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.aceitaWhatsApp).toBe(false);
    }
  });

  it("mantém aceitaWhatsApp como true quando o visitante marca a opção", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, aceitaWhatsApp: true });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.aceitaWhatsApp).toBe(true);
    }
  });

  it("normaliza o CEP com hífen para só os 8 dígitos", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, cep: "81000-000" });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.cep).toBe("81000000");
    }
  });

  it("aceita CEP em branco, por ser opcional", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, cep: "" });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.cep).toBe("");
    }
  });

  it("rejeita CEP com dígitos faltando", () => {
    expect(mensagensPorCampo({ ...BASE_VALIDA, cep: "81000-00" }).cep).toEqual([
      "CEP deve ter 8 dígitos.",
    ]);
  });

  it("rejeita data de nascimento antes de 1900", () => {
    expect(
      mensagensPorCampo({ ...BASE_VALIDA, dataNascimento: "1899-12-31" }).dataNascimento
    ).toEqual(["Confira o ano de nascimento."]);
  });

  it("aceita data de nascimento em 1900-01-01, o limite mínimo", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, dataNascimento: "1900-01-01" });
    expect(resultado.success).toBe(true);
  });

  it("rejeita data fora do formato AAAA-MM-DD", () => {
    const resultado = visitanteSchema.safeParse({ ...BASE_VALIDA, dataNascimento: "20/05/1990" });
    expect(resultado.success).toBe(false);
  });
});
