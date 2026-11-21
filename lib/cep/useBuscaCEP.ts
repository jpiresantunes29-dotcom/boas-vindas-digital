import { useCallback, useRef, useState } from "react";

export interface DadosCEP {
  logradouro: string;
  bairro: string;
  cidade: string;
}

/** Tempo máximo de espera pelo ViaCEP antes de desistir (rede ruim no culto). */
const TIMEOUT_MS = 6000;

const MENSAGEM_CEP_NAO_ENCONTRADO = "CEP não encontrado.";
const MENSAGEM_FALHA_BUSCA = "Não conseguimos verificar o CEP agora.";

function textoOuVazio(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Hook para buscar dados de endereço a partir de um CEP usando a API ViaCEP.
 * Retorna os dados e um estado de carregamento. Se o CEP não existir, retorna null.
 *
 * Só a busca mais recente vale: se o visitante corrige o CEP enquanto a
 * anterior ainda está em andamento, a resposta antiga é descartada (devolve
 * null e não mexe em `erro`/`carregando`) — senão ela poderia chegar depois e
 * sobrescrever o endereço certo.
 */
export function useBuscaCEP() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /** Identificador da última busca disparada — conta buscas, não CEPs, para repetir o mesmo CEP também funcionar. */
  const ultimaBusca = useRef(0);

  const buscar = useCallback(async (cepRaw: string): Promise<DadosCEP | null> => {
    const cep = cepRaw.replace(/\D/g, "");
    if (cep.length !== 8) return null;

    const idBusca = ++ultimaBusca.current;
    const ehAtual = () => idBusca === ultimaBusca.current;

    setCarregando(true);
    setErro(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // 4xx/5xx (ex.: ViaCEP fora do ar) é tratado como falha de rede.
      if (!res.ok) throw new Error(`ViaCEP respondeu ${res.status}`);

      const dados: unknown = await res.json();
      if (!ehAtual()) return null;

      if (typeof dados !== "object" || dados === null) {
        throw new Error("Resposta inesperada do ViaCEP");
      }

      const registro = dados as Record<string, unknown>;
      // O ViaCEP responde 200 com { "erro": true } (ou "true") para CEP inexistente.
      if (registro.erro) {
        setErro(MENSAGEM_CEP_NAO_ENCONTRADO);
        return null;
      }

      return {
        logradouro: textoOuVazio(registro.logradouro),
        bairro: textoOuVazio(registro.bairro),
        cidade: textoOuVazio(registro.localidade),
      };
    } catch {
      if (ehAtual()) setErro(MENSAGEM_FALHA_BUSCA);
      return null;
    } finally {
      if (ehAtual()) setCarregando(false);
    }
  }, []);

  return { buscar, carregando, erro, setErro };
}
