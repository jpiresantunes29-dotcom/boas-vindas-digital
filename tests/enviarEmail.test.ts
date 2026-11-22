// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { visitanteSchema, type VisitanteInput } from "@/lib/validacao/visitanteSchema";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

// "server-only" lança fora do bundle de servidor do Next; nos testes, vira no-op.
vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

import { lerEmails, notificarNovoVisitante } from "@/lib/notificacao/enviarEmail";

const ENTRADA_BASE: VisitanteInput = {
  nome: "Maria da Silva",
  celular: "(41) 99747-9889",
  email: "maria@exemplo.com",
  sexo: "feminino",
  dataNascimento: "1990-05-20",
  cep: "81000-000",
  endereco: "Rua das Flores",
  numero: "100",
  bairro: "Centro",
  cidade: "Curitiba",
  desejaSeUnir: true,
  desejaReceberVisita: false,
  aceitaWhatsApp: false,
  aceitaPrivacidade: true,
  empresa: "",
};

function visitante(sobrescrever: Partial<VisitanteInput> = {}) {
  return visitanteSchema.parse({ ...ENTRADA_BASE, ...sobrescrever });
}

function htmlEnviado(): string {
  return mocks.send.mock.calls.at(-1)![0].html as string;
}

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_teste");
  vi.stubEnv("NOTIFICACAO_EMAIL_PRINCIPAL", "pastor@exemplo.com");
  vi.stubEnv("NOTIFICACAO_EMAIL_ADMIN", "");
  mocks.send.mockReset();
  mocks.send.mockResolvedValue({ data: { id: "email-1" }, error: null, headers: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("notificarNovoVisitante", () => {
  it("registra no log o erro devolvido pelo Resend (sem exceção) e não lança", async () => {
    const erroResend = {
      name: "validation_error",
      message: "The from address is not verified.",
      statusCode: 403,
    };
    mocks.send.mockResolvedValue({ data: null, error: erroResend, headers: null });

    await expect(notificarNovoVisitante(visitante(), false)).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(expect.any(String), erroResend);
  });

  it("usa o remetente padrão quando RESEND_EMAIL_REMETENTE existe mas está vazia", async () => {
    vi.stubEnv("RESEND_EMAIL_REMETENTE", "  ");

    await notificarNovoVisitante(visitante(), false);

    expect(mocks.send.mock.calls[0][0].from).toBe("onboarding@resend.dev");
  });

  it("envia um e-mail por destinatário: a recusa de um não impede o outro", async () => {
    vi.stubEnv("NOTIFICACAO_EMAIL_ADMIN", " admin@exemplo.com ");
    mocks.send.mockImplementation(async ({ to }: { to: string[] }) =>
      to[0] === "admin@exemplo.com"
        ? { data: null, error: { name: "validation_error", message: "403" }, headers: null }
        : { data: { id: "ok" }, error: null, headers: null }
    );

    await notificarNovoVisitante(visitante(), false);

    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send.mock.calls.map((c) => c[0].to)).toEqual([
      ["pastor@exemplo.com"],
      ["admin@exemplo.com"],
    ]);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("p***@exemplo.com"));
  });

  it("não duplica o envio quando principal e admin são o mesmo e-mail", async () => {
    vi.stubEnv("NOTIFICACAO_EMAIL_ADMIN", "pastor@exemplo.com");

    await notificarNovoVisitante(visitante(), false);

    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("registra no log e não lança quando o SDK lança (ex.: falha de rede)", async () => {
    mocks.send.mockRejectedValue(new Error("fetch failed"));

    await expect(notificarNovoVisitante(visitante(), false)).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
  });

  it("não loga erro quando o envio dá certo", async () => {
    await notificarNovoVisitante(visitante(), false);

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0]).toMatchObject({
      to: ["pastor@exemplo.com"],
      subject: "Novo visitante: Maria da Silva",
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("não tenta enviar sem RESEND_API_KEY", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await notificarNovoVisitante(visitante(), false);

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("escapa conteúdo malicioso no HTML", async () => {
    await notificarNovoVisitante(
      visitante({
        nome: `<script>alert("x")</script>`,
        pedidoOracao: `<img src=x onerror='alert(1)'> & mais`,
      }),
      false
    );

    const html = htmlEnviado();
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&#39;alert(1)&#39;&gt; &amp; mais");
  });

  it("inclui sexo, CEP formatado, data dd/mm/aaaa e o opt-in de WhatsApp", async () => {
    await notificarNovoVisitante(visitante(), false);

    const html = htmlEnviado();
    expect(html).toContain("<strong>Sexo:</strong> Feminino");
    expect(html).toContain("CEP 81000-000");
    expect(html).toContain("<strong>Data de nascimento:</strong> 20/05/1990");
    expect(html).toContain("<strong>Aceita receber WhatsApp:</strong> Não");
  });

  it("mostra Masculino e 'Sim' no opt-in quando é o caso, e omite o CEP vazio", async () => {
    await notificarNovoVisitante(
      visitante({ sexo: "masculino", aceitaWhatsApp: true, cep: "" }),
      true
    );

    const html = htmlEnviado();
    expect(html).toContain("<strong>Sexo:</strong> Masculino");
    expect(html).toContain("<strong>Aceita receber WhatsApp:</strong> Sim");
    expect(html).not.toContain("CEP");
    expect(mocks.send.mock.calls[0][0].subject).toBe("Visitante recorrente: Maria da Silva");
  });
});

describe("lerEmails", () => {
  it.each([
    ["pastor@exemplo.com", ["pastor@exemplo.com"]],
    ['  "Pastor@Exemplo.com"  ', ["pastor@exemplo.com"]],
    ["mailto:pastor@exemplo.com", ["pastor@exemplo.com"]],
    ["Pastor João <pastor@exemplo.com>", ["pastor@exemplo.com"]],
    ["a@exemplo.com, b@exemplo.com; c@exemplo.com", ["a@exemplo.com", "b@exemplo.com", "c@exemplo.com"]],
  ])("normaliza %j", (valor, esperado) => {
    vi.stubEnv("NOTIFICACAO_EMAIL_PRINCIPAL", valor);
    expect(lerEmails("NOTIFICACAO_EMAIL_PRINCIPAL")).toEqual(esperado);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("descarta valor inválido e diz no log qual variável corrigir", async () => {
    vi.stubEnv("NOTIFICACAO_EMAIL_ADMIN", "pastor exemplo.com");

    await notificarNovoVisitante(visitante(), false);

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("NOTIFICACAO_EMAIL_ADMIN"));
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0].to).toEqual(["pastor@exemplo.com"]);
  });
});
