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
  empresa: "",
};

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
});
