// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VisitanteInput } from "@/lib/validacao/visitanteSchema";

const mocks = vi.hoisted(() => {
  const insert = vi.fn();
  const eq = vi.fn();
  return {
    // Callbacks agendados com after(): ficam guardados até o teste executá-los,
    // como acontece de verdade (só depois que a resposta foi enviada).
    tarefasAfter: [] as Array<() => unknown>,
    cabecalhos: new Headers(),
    insert,
    eq,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq })),
        insert,
      })),
    },
    excedeuLimite: vi.fn(() => false),
    notificarNovoVisitante: vi.fn(async () => {}),
    notificarVisitante: vi.fn(async () => {}),
    notificarResponsavel: vi.fn(async () => {}),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => mocks.cabecalhos),
}));
vi.mock("next/server", () => ({
  after: vi.fn((tarefa: () => unknown) => {
    mocks.tarefasAfter.push(tarefa);
  }),
}));
vi.mock("@/lib/supabase/client", () => ({
  criarClienteSupabaseAdmin: () => mocks.supabase,
}));
vi.mock("@/lib/seguranca/rateLimit", () => ({
  excedeuLimite: mocks.excedeuLimite,
}));
vi.mock("@/lib/notificacao/enviarEmail", () => ({
  notificarNovoVisitante: mocks.notificarNovoVisitante,
}));
vi.mock("@/lib/notificacao/enviarWhatsApp", () => ({
  notificarVisitante: mocks.notificarVisitante,
  notificarResponsavel: mocks.notificarResponsavel,
}));

import { cadastrarVisitante } from "@/app/actions/visitantes";

const MENSAGEM_ERRO_GENERICA =
  "Não conseguimos enviar agora. Seus dados continuam aqui — toque em enviar de novo.";

const DADOS_VALIDOS: VisitanteInput = {
  nome: "Maria da Silva",
  celular: "(41) 99747-9889",
  email: "",
  sexo: "feminino",
  dataNascimento: "1990-05-20",
  cep: "81000-000",
  endereco: "Rua das Flores",
  numero: "100",
  bairro: "Centro",
  cidade: "Curitiba",
  desejaSeUnir: true,
  desejaReceberVisita: false,
  pedidoOracao: "",
  aceitaWhatsApp: false,
  aceitaPrivacidade: true,
  empresa: "",
};

async function executarTarefasAfter() {
  const tarefas = mocks.tarefasAfter.splice(0);
  await Promise.all(tarefas.map((tarefa) => tarefa()));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tarefasAfter.length = 0;
  mocks.cabecalhos = new Headers({ "x-forwarded-for": "198.51.100.9" });
  mocks.excedeuLimite.mockReturnValue(false);
  mocks.eq.mockResolvedValue({ count: 0, error: null });
  mocks.insert.mockResolvedValue({ error: null });
  vi.stubEnv("NOTIFICACAO_WHATSAPP_NUMERO", "5541988887777");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("cadastrarVisitante", () => {
  it("grava cep, aceita_whatsapp e o momento do consentimento de privacidade", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T22:00:00Z"));

    const resultado = await cadastrarVisitante(DADOS_VALIDOS);

    expect(resultado).toEqual({ ok: true, nome: "Maria da Silva", recorrente: false });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        celular: "41997479889",
        cep: "81000000",
        aceita_whatsapp: false,
        consentimento_privacidade_em: "2026-03-01T22:00:00.000Z",
        recorrente: false,
      })
    );
  });

  it("grava cep nulo quando não foi informado", async () => {
    await cadastrarVisitante({ ...DADOS_VALIDOS, cep: "" });

    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ cep: null }));
  });

  it("agenda as notificações com after() — nada é enviado antes da resposta", async () => {
    await cadastrarVisitante(DADOS_VALIDOS);

    expect(mocks.tarefasAfter).toHaveLength(1);
    expect(mocks.notificarNovoVisitante).not.toHaveBeenCalled();

    await executarTarefasAfter();

    expect(mocks.notificarNovoVisitante).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Maria da Silva" }),
      false
    );
  });

  it("não envia WhatsApp ao visitante quando aceitaWhatsApp=false", async () => {
    await cadastrarVisitante({ ...DADOS_VALIDOS, aceitaWhatsApp: false });
    await executarTarefasAfter();

    expect(mocks.notificarVisitante).not.toHaveBeenCalled();
    expect(mocks.notificarNovoVisitante).toHaveBeenCalledTimes(1);
    expect(mocks.notificarResponsavel).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Maria da Silva", celular: "41997479889" }),
      false,
      "5541988887777"
    );
  });

  it("envia WhatsApp ao visitante quando aceitaWhatsApp=true", async () => {
    await cadastrarVisitante({ ...DADOS_VALIDOS, aceitaWhatsApp: true });
    await executarTarefasAfter();

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ aceita_whatsapp: true })
    );
    expect(mocks.notificarVisitante).toHaveBeenCalledWith("Maria da Silva", "41997479889");
  });

  it("não notifica o responsável quando NOTIFICACAO_WHATSAPP_NUMERO não está definido", async () => {
    vi.stubEnv("NOTIFICACAO_WHATSAPP_NUMERO", "");

    await cadastrarVisitante(DADOS_VALIDOS);
    await executarTarefasAfter();

    expect(mocks.notificarResponsavel).not.toHaveBeenCalled();
    expect(mocks.notificarNovoVisitante).toHaveBeenCalledTimes(1);
  });

  it("uma notificação que falha não impede as outras nem quebra o cadastro", async () => {
    mocks.notificarNovoVisitante.mockRejectedValueOnce(new Error("Resend fora do ar"));

    const resultado = await cadastrarVisitante({ ...DADOS_VALIDOS, aceitaWhatsApp: true });
    await expect(executarTarefasAfter()).resolves.toBeUndefined();

    expect(resultado.ok).toBe(true);
    expect(mocks.notificarVisitante).toHaveBeenCalledTimes(1);
    expect(mocks.notificarResponsavel).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
  });

  it("honeypot preenchido → erro genérico, sem gravar nem notificar", async () => {
    const resultado = await cadastrarVisitante({ ...DADOS_VALIDOS, empresa: "Spam Ltda" });

    expect(resultado).toEqual({ ok: false, erro: MENSAGEM_ERRO_GENERICA });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.tarefasAfter).toHaveLength(0);
  });

  it("dados inválidos → camposInvalidos, sem gravar", async () => {
    const resultado = await cadastrarVisitante({
      ...DADOS_VALIDOS,
      nome: "",
      celular: "4199",
      aceitaPrivacidade: false,
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.camposInvalidos).toEqual(
      expect.objectContaining({
        nome: expect.any(String),
        celular: expect.any(String),
        aceitaPrivacidade: expect.any(String),
      })
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("erro no insert → erro genérico e nenhuma notificação", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "column does not exist" } });

    const resultado = await cadastrarVisitante(DADOS_VALIDOS);

    expect(resultado).toEqual({ ok: false, erro: MENSAGEM_ERRO_GENERICA });
    expect(mocks.tarefasAfter).toHaveLength(0);
  });

  it("sem a migration 0003 (PGRST204), grava sem as colunas novas e conclui o cadastro", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.insert
      .mockResolvedValueOnce({
        error: { code: "PGRST204", message: "Could not find the 'cep' column of 'visitantes'" },
      })
      .mockResolvedValueOnce({ error: null });

    const resultado = await cadastrarVisitante(DADOS_VALIDOS);

    expect(resultado).toMatchObject({ ok: true });
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    const segundaGravacao = mocks.insert.mock.calls[1][0] as Record<string, unknown>;
    expect(segundaGravacao).not.toHaveProperty("cep");
    expect(segundaGravacao).not.toHaveProperty("aceita_whatsapp");
    expect(segundaGravacao).not.toHaveProperty("consentimento_privacidade_em");
    expect(segundaGravacao).toHaveProperty("nome");
    expect(mocks.tarefasAfter).toHaveLength(1);
  });

  it("marca como recorrente quando o celular já existe", async () => {
    mocks.eq.mockResolvedValue({ count: 2, error: null });

    const resultado = await cadastrarVisitante(DADOS_VALIDOS);

    expect(resultado).toEqual({ ok: true, nome: "Maria da Silva", recorrente: true });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ recorrente: true }));
  });

  it("usa x-real-ip para o limite de taxa, com x-forwarded-for como alternativa", async () => {
    mocks.cabecalhos = new Headers({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.9, 10.0.0.1",
    });
    await cadastrarVisitante(DADOS_VALIDOS);
    expect(mocks.excedeuLimite).toHaveBeenLastCalledWith("203.0.113.7");

    mocks.cabecalhos = new Headers({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" });
    await cadastrarVisitante(DADOS_VALIDOS);
    expect(mocks.excedeuLimite).toHaveBeenLastCalledWith("198.51.100.9");
  });

  it("limite de taxa excedido → recusa sem gravar", async () => {
    mocks.excedeuLimite.mockReturnValue(true);

    const resultado = await cadastrarVisitante(DADOS_VALIDOS);

    expect(resultado.ok).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
