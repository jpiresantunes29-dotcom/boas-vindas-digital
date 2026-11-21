import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBuscaCEP } from "@/lib/cep/useBuscaCEP";

/** Resposta JSON real (Response do fetch), sem precisar de `any`. */
function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useBuscaCEP", () => {
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("busca dados válidos para um CEP existente", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaJson({
        logradouro: "Rua das Flores",
        bairro: "Centro",
        localidade: "Curitiba",
      })
    );

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("80010-000");

    expect(dados).toEqual({
      logradouro: "Rua das Flores",
      bairro: "Centro",
      cidade: "Curitiba",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/80010000/json/",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("devolve campos vazios quando o ViaCEP não traz logradouro (cidade com CEP único)", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaJson({ logradouro: "", bairro: "", localidade: "Quatro Barras" })
    );

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("83420000");

    expect(dados).toEqual({ logradouro: "", bairro: "", cidade: "Quatro Barras" });
  });

  it("retorna null e seta erro para CEP não encontrado", async () => {
    fetchMock.mockResolvedValueOnce(respostaJson({ erro: true }));

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("00000000");

    expect(dados).toBeNull();
    await waitFor(() => {
      expect(result.current.erro).toBe("CEP não encontrado.");
    });
  });

  it("retorna null e seta erro em caso de erro de rede", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("80010000");

    expect(dados).toBeNull();
    await waitFor(() => {
      expect(result.current.erro).toBe("Não conseguimos verificar o CEP agora.");
    });
  });

  it("trata resposta HTTP de erro (res.ok = false) como falha de rede", async () => {
    fetchMock.mockResolvedValueOnce(respostaJson({ mensagem: "indisponível" }, 503));

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("80010000");

    expect(dados).toBeNull();
    await waitFor(() => {
      expect(result.current.erro).toBe("Não conseguimos verificar o CEP agora.");
    });
    expect(result.current.carregando).toBe(false);
  });

  it("trata corpo que não é objeto como falha", async () => {
    fetchMock.mockResolvedValueOnce(respostaJson(null));

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("80010000");

    expect(dados).toBeNull();
    await waitFor(() => {
      expect(result.current.erro).toBe("Não conseguimos verificar o CEP agora.");
    });
  });

  it("descarta a resposta de uma busca anterior quando outra é disparada depois", async () => {
    let responderPrimeira: (res: Response) => void = () => {};
    fetchMock
      .mockReturnValueOnce(
        new Promise<Response>((resolver) => {
          responderPrimeira = resolver;
        })
      )
      .mockResolvedValueOnce(
        respostaJson({ logradouro: "Rua Nova", bairro: "Batel", localidade: "Curitiba" })
      );

    const { result } = renderHook(() => useBuscaCEP());
    const primeira = result.current.buscar("80010000");
    const segunda = await result.current.buscar("80420000");

    // A primeira responde só agora, depois da segunda — deve ser ignorada.
    responderPrimeira(
      respostaJson({ logradouro: "Rua Antiga", bairro: "Centro", localidade: "Curitiba" })
    );

    expect(segunda).toEqual({ logradouro: "Rua Nova", bairro: "Batel", cidade: "Curitiba" });
    expect(await primeira).toBeNull();
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).toBeNull();
  });

  it("retorna null para CEP com menos de 8 dígitos", async () => {
    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("1234");

    expect(dados).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
