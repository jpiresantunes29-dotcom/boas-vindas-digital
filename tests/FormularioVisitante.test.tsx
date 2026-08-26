import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioVisitante } from "@/components/formulario/FormularioVisitante";
import { cadastrarVisitante, type ResultadoCadastro } from "@/app/actions/visitantes";

vi.mock("@/app/actions/visitantes", () => ({
  cadastrarVisitante: vi.fn(),
}));

const cadastrarVisitanteMock = vi.mocked(cadastrarVisitante);

async function renderComCamposObrigatorios(aoConcluir = vi.fn()) {
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
});
