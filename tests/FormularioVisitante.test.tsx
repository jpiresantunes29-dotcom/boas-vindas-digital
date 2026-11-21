import { afterEach, beforeEach, describe, expect, it, vi, type Mock, type MockInstance } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioVisitante } from "@/components/formulario/FormularioVisitante";
import { cadastrarVisitante, type ResultadoCadastro } from "@/app/actions/visitantes";

vi.mock("@/app/actions/visitantes", () => ({
  cadastrarVisitante: vi.fn(),
}));

const cadastrarVisitanteMock = vi.mocked(cadastrarVisitante);

const MENSAGEM_CONSENTIMENTO =
  "Para enviar, confirme que leu e concorda com o aviso de privacidade.";

function campoConsentimento() {
  return screen.getByRole("checkbox", { name: /li e concordo com o aviso de privacidade/i });
}

function campoWhatsApp() {
  return screen.getByRole("checkbox", { name: /confirmação do cadastro no whatsapp/i });
}

/** Resposta JSON real (Response do fetch) para simular o ViaCEP. */
function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function renderComCamposObrigatorios({
  aoConcluir = vi.fn(),
  aceitarPrivacidade = true,
}: { aoConcluir?: Mock; aceitarPrivacidade?: boolean } = {}) {
  const usuario = userEvent.setup();
  render(<FormularioVisitante aoConcluir={aoConcluir} />);
  await usuario.type(screen.getByLabelText(/nome completo/i), "Maria Souza");
  await usuario.type(screen.getByLabelText(/celular/i), "41997479889");
  fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
    target: { value: "1990-05-20" },
  });
  await usuario.type(screen.getByLabelText(/^endereço/i), "Rua das Flores");
  await usuario.type(screen.getByLabelText(/^número/i), "100");
  await usuario.click(screen.getByLabelText(/me unir a essa igreja/i));
  if (aceitarPrivacidade) await usuario.click(campoConsentimento());
  return { usuario, aoConcluir };
}

describe("FormularioVisitante", () => {
  beforeEach(() => {
    cadastrarVisitanteMock.mockReset();
  });

  it("mostra mensagens de erro compreensíveis ao tentar enviar vazio", async () => {
    const usuario = userEvent.setup();
    render(<FormularioVisitante aoConcluir={vi.fn()} />);

    await usuario.click(screen.getByRole("button", { name: /enviar/i }));

    expect(await screen.findByText("Informe seu nome completo.")).toBeInTheDocument();
    expect(cadastrarVisitanteMock).not.toHaveBeenCalled();
  });

  it('exibe "quem convidou" somente quando a opção Convite é marcada', async () => {
    const usuario = userEvent.setup();
    render(<FormularioVisitante aoConcluir={vi.fn()} />);

    expect(screen.queryByLabelText(/nome e telefone de quem convidou/i)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("radio", { name: "Convite" }));

    expect(screen.getByLabelText(/nome e telefone de quem convidou/i)).toBeInTheDocument();
  });

  it("desabilita o botão e evita reenvio duplicado enquanto o cadastro está em andamento", async () => {
    let resolverPromessa: (valor: ResultadoCadastro) => void = () => {};
    cadastrarVisitanteMock.mockReturnValue(
      new Promise((resolver) => {
        resolverPromessa = resolver;
      })
    );

    const { usuario } = await renderComCamposObrigatorios();
    const botao = screen.getByRole("button", { name: /enviar/i });
    await usuario.click(botao);

    await waitFor(() => expect(botao).toBeDisabled());
    expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled();
    expect(cadastrarVisitanteMock).toHaveBeenCalledTimes(1);

    resolverPromessa({ ok: true, nome: "Maria Souza", recorrente: false });
  });

  it("chama aoConcluir com o nome e a marcação de recorrência quando o envio dá certo", async () => {
    cadastrarVisitanteMock.mockResolvedValue({
      ok: true,
      nome: "Maria Souza",
      recorrente: true,
    });
    const { usuario, aoConcluir } = await renderComCamposObrigatorios();
    await usuario.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() =>
      expect(aoConcluir).toHaveBeenCalledWith({ nome: "Maria Souza", recorrente: true })
    );
  });

  it("mostra o erro devolvido pelo servidor sem perder os dados já digitados", async () => {
    cadastrarVisitanteMock.mockResolvedValue({
      ok: false,
      erro: "Não conseguimos enviar agora. Seus dados continuam aqui — toque em enviar de novo.",
    });

    const { usuario } = await renderComCamposObrigatorios();
    await usuario.click(screen.getByRole("button", { name: /enviar/i }));

    expect(
      await screen.findByText(/não conseguimos enviar agora/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue("Maria Souza");
  });

  it("não envia sem o consentimento de privacidade e mostra o motivo", async () => {
    const { usuario } = await renderComCamposObrigatorios({ aceitarPrivacidade: false });
    await usuario.click(screen.getByRole("button", { name: /enviar/i }));

    expect(await screen.findByText(MENSAGEM_CONSENTIMENTO)).toBeInTheDocument();
    expect(campoConsentimento()).toHaveAttribute("aria-invalid", "true");
    expect(campoConsentimento()).toHaveAttribute("aria-describedby", "aceitaPrivacidade-erro");
    expect(cadastrarVisitanteMock).not.toHaveBeenCalled();
  });

  it("abre o aviso de privacidade em nova aba", () => {
    render(<FormularioVisitante aoConcluir={vi.fn()} />);

    const link = screen.getByRole("link", { name: /aviso de privacidade/i });
    expect(link).toHaveAttribute("href", "/privacidade");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("envia aceitaWhatsApp como true quando a opção é marcada", async () => {
    cadastrarVisitanteMock.mockResolvedValue({ ok: true, nome: "Maria Souza", recorrente: false });
    const { usuario } = await renderComCamposObrigatorios();
    await usuario.click(campoWhatsApp());
    await usuario.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => expect(cadastrarVisitanteMock).toHaveBeenCalledTimes(1));
    expect(cadastrarVisitanteMock).toHaveBeenCalledWith(
      expect.objectContaining({ aceitaWhatsApp: true, aceitaPrivacidade: true })
    );
  });

  it("envia aceitaWhatsApp como false quando a opção não é marcada (opt-in)", async () => {
    cadastrarVisitanteMock.mockResolvedValue({ ok: true, nome: "Maria Souza", recorrente: false });
    const { usuario } = await renderComCamposObrigatorios();
    expect(campoWhatsApp()).not.toBeChecked();
    await usuario.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => expect(cadastrarVisitanteMock).toHaveBeenCalledTimes(1));
    expect(cadastrarVisitanteMock).toHaveBeenCalledWith(
      expect.objectContaining({ aceitaWhatsApp: false })
    );
  });

  it("limita a data de nascimento entre 1900-01-01 e hoje", () => {
    render(<FormularioVisitante aoConcluir={vi.fn()} />);

    const agora = new Date();
    const hoje = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, "0"),
      String(agora.getDate()).padStart(2, "0"),
    ].join("-");
    const campo = screen.getByLabelText(/data de nascimento/i);
    expect(campo).toHaveAttribute("min", "1900-01-01");
    expect(campo).toHaveAttribute("max", hoje);
  });
});

describe("FormularioVisitante — busca de CEP", () => {
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    cadastrarVisitanteMock.mockReset();
    fetchMock = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("aplica a máscara, preenche o endereço e leva o foco ao número", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaJson({ logradouro: "Rua XV de Novembro", bairro: "Centro", localidade: "Curitiba" })
    );
    const usuario = userEvent.setup();
    render(<FormularioVisitante aoConcluir={vi.fn()} />);

    const cep = screen.getByLabelText(/^cep/i);
    await usuario.type(cep, "80020310");
    expect(cep).toHaveValue("80020-310");
    expect(cep).toHaveAttribute("maxLength", "9");

    await usuario.tab();

    await waitFor(() =>
      expect(screen.getByLabelText(/^endereço/i)).toHaveValue("Rua XV de Novembro")
    );
    expect(screen.getByLabelText(/^bairro/i)).toHaveValue("Centro");
    await waitFor(() => expect(screen.getByLabelText(/^número/i)).toHaveFocus());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://viacep.com.br/ws/80020310/json/");
  });

  it("não apaga o endereço digitado quando o ViaCEP vem sem logradouro", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaJson({ logradouro: "", bairro: "", localidade: "Quatro Barras" })
    );
    const usuario = userEvent.setup();
    render(<FormularioVisitante aoConcluir={vi.fn()} />);

    const endereco = screen.getByLabelText(/^endereço/i);
    await usuario.type(endereco, "Rua Principal");
    await usuario.type(screen.getByLabelText(/^cep/i), "83420000");
    await usuario.tab();

    await waitFor(() => expect(screen.getByLabelText(/^cidade/i)).toHaveValue("Quatro Barras"));
    expect(endereco).toHaveValue("Rua Principal");
    // Sem rua no retorno, o foco vai para o endereço (e não pula para o número).
    await waitFor(() => expect(endereco).toHaveFocus());
  });

  it("deixa o CEP somente leitura (não desabilitado) e avisa enquanto busca", async () => {
    let responder: (res: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolver) => {
        responder = resolver;
      })
    );
    const usuario = userEvent.setup();
    render(<FormularioVisitante aoConcluir={vi.fn()} />);

    const cep = screen.getByLabelText(/^cep/i);
    await usuario.type(cep, "80020310");
    await usuario.tab();

    expect(await screen.findByText("Buscando endereço…")).toBeInTheDocument();
    expect(cep).toHaveAttribute("readonly");
    expect(cep).toHaveAttribute("aria-busy", "true");
    expect(cep).not.toBeDisabled();

    responder(
      respostaJson({ logradouro: "Rua XV de Novembro", bairro: "Centro", localidade: "Curitiba" })
    );

    await waitFor(() => expect(cep).not.toHaveAttribute("readonly"));
    expect(screen.queryByText("Buscando endereço…")).not.toBeInTheDocument();
    expect(cep).toHaveValue("80020-310");
  });
});
