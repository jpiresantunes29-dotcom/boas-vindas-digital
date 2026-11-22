// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IGREJA } from "@/lib/config/igreja";
import { visitanteSchema, type VisitanteInput } from "@/lib/validacao/visitanteSchema";

// "server-only" lança fora do bundle de servidor do Next; nos testes, vira no-op.
vi.mock("server-only", () => ({}));

import {
  enviarMensagemWhatsApp,
  formatarNumeroParaEvolution,
  montarMensagemResponsavel,
  notificarResponsavel,
  notificarVisitante,
} from "@/lib/notificacao/enviarWhatsApp";

const VISITANTE: VisitanteInput = {
  nome: "Maria da Silva",
  celular: "(41) 99747-9889",
  email: "maria@exemplo.com",
  sexo: "feminino",
  estadoCivil: "casado",
  dataNascimento: "1990-05-20",
  cep: "81000-000",
  endereco: "Rua das Flores",
  numero: "100",
  complemento: "Apto 12",
  tipoMoradia: "apartamento",
  bairro: "CIC",
  cidade: "Curitiba",
  comoConheceu: "convite",
  convidadoPor: "João (41) 98888-7777",
  outraIgreja: "Nenhuma",
  desejaSeUnir: true,
  desejaReceberVisita: true,
  pedidoOracao: "Pela saúde da minha mãe.",
  aceitaWhatsApp: true,
  aceitaPrivacidade: true,
  empresa: "",
};

function visitante(sobrescrever: Partial<VisitanteInput> = {}) {
  return visitanteSchema.parse({ ...VISITANTE, ...sobrescrever });
}

const fetchMock = vi.fn<typeof fetch>();

function ultimaChamada() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return {
    url: String(url),
    init: init!,
    headers: init!.headers as Record<string, string>,
    corpo: JSON.parse(String(init!.body)) as { number: string; text: string },
  };
}

beforeEach(() => {
  vi.stubEnv("EVOLUTION_API_URL", "https://evolution.exemplo.com/");
  vi.stubEnv("EVOLUTION_API_KEY", "chave-secreta");
  vi.stubEnv("EVOLUTION_INSTANCE", "igreja");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ key: { id: "ABC" } }), { status: 201 })
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("formatarNumeroParaEvolution", () => {
  it("prefixa o DDI 55 em número com DDD 41 (10 ou 11 dígitos)", () => {
    expect(formatarNumeroParaEvolution("(41) 99747-9889")).toBe("5541997479889");
    expect(formatarNumeroParaEvolution("41 3333-4444")).toBe("554133334444");
  });

  it("prefixa o DDI 55 em celular de DDD 55 (RS) — não confunde DDD com DDI", () => {
    expect(formatarNumeroParaEvolution("55999998888")).toBe("5555999998888");
    expect(formatarNumeroParaEvolution("(55) 3222-1111")).toBe("555532221111");
  });

  it("mantém número que já vem com DDI 55 (12 ou 13 dígitos)", () => {
    expect(formatarNumeroParaEvolution("+55 41 99747-9889")).toBe("5541997479889");
    expect(formatarNumeroParaEvolution("+55 55 99999-8888")).toBe("5555999998888");
    expect(formatarNumeroParaEvolution("554133334444")).toBe("554133334444");
  });
});

describe("enviarMensagemWhatsApp", () => {
  it("autentica com o header apikey (e não com Authorization: Bearer)", async () => {
    const resultado = await enviarMensagemWhatsApp("41997479889", "Olá");

    expect(resultado).toEqual({ sucesso: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init, headers } = ultimaChamada();
    expect(url).toBe("https://evolution.exemplo.com/message/sendText/igreja");
    expect(init.method).toBe("POST");
    expect(headers.apikey).toBe("chave-secreta");
    expect(headers).not.toHaveProperty("Authorization");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("envia número de DDD 41 formatado com DDI", async () => {
    await enviarMensagemWhatsApp("(41) 99747-9889", "Olá");
    expect(ultimaChamada().corpo).toEqual({ number: "5541997479889", text: "Olá" });
  });

  it("envia número de DDD 55 formatado com DDI", async () => {
    await enviarMensagemWhatsApp("55999998888", "Olá");
    expect(ultimaChamada().corpo.number).toBe("5555999998888");
  });

  it("não chama a API quando as variáveis de ambiente não estão definidas", async () => {
    vi.stubEnv("EVOLUTION_API_KEY", "");

    const resultado = await enviarMensagemWhatsApp("41997479889", "Olá");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resultado.sucesso).toBe(false);
  });

  it("devolve sucesso: false sem lançar quando a API responde com erro HTTP", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"message":"5541997479889 não existe no WhatsApp"}', { status: 400 })
    );

    const resultado = await enviarMensagemWhatsApp("41997479889", "Olá");

    expect(resultado).toEqual({ sucesso: false, erro: "HTTP 400" });
    expect(console.error).toHaveBeenCalled();
    // O telefone ecoado pela API não vai para o log.
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("997479889");
  });

  it("devolve sucesso: false sem lançar quando a rede falha", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const resultado = await enviarMensagemWhatsApp("41997479889", "Olá");

    expect(resultado).toEqual({ sucesso: false, erro: "fetch failed" });
  });

  it("não grava o telefone de destino no log de sucesso", async () => {
    await enviarMensagemWhatsApp("41997479889", "Olá");

    const logs = JSON.stringify([
      vi.mocked(console.log).mock.calls,
      vi.mocked(console.warn).mock.calls,
      vi.mocked(console.error).mock.calls,
    ]);
    expect(logs).not.toContain("997479889");
  });
});

describe("mensagens", () => {
  it("cumprimenta o visitante pelo primeiro nome e usa o nome da igreja", async () => {
    await notificarVisitante("Maria da Silva", "41997479889");

    const { corpo } = ultimaChamada();
    expect(corpo.number).toBe("5541997479889");
    expect(corpo.text).toContain("Oi Maria!");
    expect(corpo.text).toContain(IGREJA.nome);
  });

  it("usa o fuso da igreja na data/hora do aviso ao responsável, não o do servidor", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 01:30 UTC de 1º/mar = 22:30 de 28/fev em São Paulo (UTC-3).
    vi.setSystemTime(new Date("2026-03-01T01:30:00Z"));

    await notificarResponsavel(visitante(), false, "5541988887777");

    const { corpo } = ultimaChamada();
    expect(corpo.number).toBe("5541988887777");
    expect(corpo.text).toContain("28/02/2026 às 22:30");
    expect(corpo.text).toContain("*Nome:* Maria da Silva");
  });

  it("manda ao responsável a ficha completa do visitante, igual à do e-mail", () => {
    const texto = montarMensagemResponsavel(visitante(), false, new Date("2026-03-01T22:00:00Z"));

    for (const trecho of [
      "📋 *Novo visitante* — 01/03/2026 às 19:00",
      "*Nome:* Maria da Silva",
      "*Celular:* (41) 99747-9889",
      "*Aceita receber WhatsApp:* Sim",
      "*E-mail:* maria@exemplo.com",
      "*Sexo:* Feminino",
      "*Estado civil:* Casado(a)",
      "*Data de nascimento:* 20/05/1990",
      "*Endereço:* Rua das Flores, 100, Apto 12, CIC, Curitiba, CEP 81000-000",
      "*Tipo de moradia:* Apartamento",
      "*Como conheceu a igreja:* Convite",
      "*Convidado por:* João (41) 98888-7777",
      "*Pertence a outra igreja:* Nenhuma",
      "*Gostaria de:* Unir-se à igreja · Receber visita",
      "*Pedido de oração:*\nPela saúde da minha mãe.",
      "💬 Falar com Maria no WhatsApp: https://wa.me/5541997479889",
    ]) {
      expect(texto).toContain(trecho);
    }
    expect(texto).not.toContain("recorrente");
  });

  it("marca visitante recorrente e omite campos não preenchidos", () => {
    const texto = montarMensagemResponsavel(
      visitante({ email: "", pedidoOracao: "", outraIgreja: "", comoConheceu: undefined, convidadoPor: "" }),
      true
    );

    expect(texto).toContain("📋 *Visitante recorrente*");
    expect(texto).toContain("⟳ Este celular já apareceu em um cadastro anterior");
    expect(texto).not.toContain("*E-mail:*");
    expect(texto).not.toContain("*Pedido de oração:*");
    expect(texto).not.toContain("*Pertence a outra igreja:*");
  });
});
