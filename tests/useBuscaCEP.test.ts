import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBuscaCEP } from "@/lib/cep/useBuscaCEP";

// Mock do fetch global
global.fetch = vi.fn();

describe("useBuscaCEP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca dados válidos para um CEP existente", async () => {
    const mockRes = {
      json: async () => ({
        logradouro: "Rua das Flores",
        bairro: "Centro",
        localidade: "Curitiba",
      }),
    };
    (global.fetch as any).mockResolvedValueOnce(mockRes);

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("80010000");

    expect(dados).toEqual({
      logradouro: "Rua das Flores",
      bairro: "Centro",
      cidade: "Curitiba",
    });
  });

  it("retorna null e seta erro para CEP não encontrado", async () => {
    const mockRes = {
      json: async () => ({ erro: true }),
    };
    (global.fetch as any).mockResolvedValueOnce(mockRes);

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("00000000");

    expect(dados).toBeNull();
    await waitFor(() => {
      expect(result.current.erro).toBe("CEP não encontrado.");
    });
  });

  it("retorna null e seta erro em caso de erro de rede", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("80010000");

    expect(dados).toBeNull();
    await waitFor(() => {
      expect(result.current.erro).toBe("Não conseguimos verificar o CEP agora.");
    });
  });

  it("retorna null para CEP com menos de 8 dígitos", async () => {
    const { result } = renderHook(() => useBuscaCEP());
    const dados = await result.current.buscar("1234");

    expect(dados).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
