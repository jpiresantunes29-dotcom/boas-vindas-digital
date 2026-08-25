import { useCallback, useState } from "react";

export interface DadosCEP {
  logradouro: string;
  bairro: string;
  cidade: string;
}

/**
 * Hook para buscar dados de endereço a partir de um CEP usando a API ViaCEP.
 * Retorna os dados e um estado de carregamento. Se o CEP não existir, retorna null.
 */
export function useBuscaCEP() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async (cepRaw: string): Promise<DadosCEP | null> => {
    const cep = cepRaw.replace(/\D/g, "");
    if (cep.length !== 8) return null;

    setCarregando(true);
    setErro(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await res.json();

      if (dados.erro) {
        setErro("CEP não encontrado.");
        return null;
      }

      return {
        logradouro: dados.logradouro || "",
        bairro: dados.bairro || "",
        cidade: dados.localidade || "",
      };
    } catch (err) {
      setErro("Não conseguimos verificar o CEP agora.");
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  return { buscar, carregando, erro, setErro };
}
