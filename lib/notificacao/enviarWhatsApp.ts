/**
 * Envia notificações via WhatsApp usando Evolution API.
 *
 * Evolution API é uma solução open source que permite enviar mensagens WhatsApp.
 * Documentação: https://docs.evolution.company/
 *
 * Para usar, você precisa:
 * 1. Deploy a Evolution API (Docker, VPS, etc.)
 * 2. Configurar as variáveis de ambiente (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE)
 */

interface RespostaEvolution {
  status?: string;
  message?: string;
  key?: { id: string };
}

/**
 * Remove caracteres especiais e formata o número para o padrão Evolution API.
 * Exemplo: "(41) 99747-9889" ou "+55 41 99747-9889" → "5541997479889"
 */
function formatarNumeroParaEvolution(numero: string): string {
  const somenteDigitos = numero.replace(/\D/g, "");
  // Se começar com 55, mantém; se não, adiciona
  if (somenteDigitos.startsWith("55")) {
    return somenteDigitos;
  }
  return `55${somenteDigitos}`;
}

/**
 * Envia uma mensagem de texto via WhatsApp (Evolution API).
 * Best-effort: se falhar, não bloqueia o fluxo de cadastro.
 */
export async function enviarMensagemWhatsApp(
  numeroDestino: string,
  mensagem: string
): Promise<{ sucesso: boolean; erro?: string }> {
  const url = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!url || !apiKey || !instance) {
    console.warn(
      "[WhatsApp] Variáveis Evolution API não configuradas. Pulando notificação."
    );
    return { sucesso: false, erro: "Evolution API não configurada" };
  }

  try {
    const numero = formatarNumeroParaEvolution(numeroDestino);
    const endpoint = `${url}/message/sendText/${instance}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        number: numero,
        text: mensagem,
      }),
    });

    if (!res.ok) {
      const erro = await res.text();
      console.error(`[WhatsApp] Erro ${res.status}: ${erro}`);
      return { sucesso: false, erro: `HTTP ${res.status}` };
    }

    const dados = (await res.json()) as RespostaEvolution;
    console.log(`[WhatsApp] Mensagem enviada para ${numero}`);
    return { sucesso: true };
  } catch (err) {
    const mensagemErro =
      err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`[WhatsApp] Erro ao enviar: ${mensagemErro}`);
    return { sucesso: false, erro: mensagemErro };
  }
}

/**
 * Notifica o visitante que seu cadastro foi recebido.
 */
export async function notificarVisitante(
  nome: string,
  celular: string
): Promise<void> {
  const mensagem = `Oi ${nome.split(" ")[0]}! 👋\n\nRecebemos seu cadastro na Aliança Cristã Curitiba. Nossa equipe vai entrar em contato em breve.\n\n🙏 Que Deus te abençoe!`;

  await enviarMensagemWhatsApp(celular, mensagem);
}

/**
 * Notifica o responsável sobre um novo visitante.
 */
export async function notificarResponsavel(
  nomeVisitante: string,
  celularVisitante: string,
  numeroResponsavel: string
): Promise<void> {
  const mensagem = `📋 Novo visitante em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n\nNome: ${nomeVisitante}\nCelular/WhatsApp: ${celularVisitante}\n\nVerifique os detalhes completos no banco de dados.`;

  await enviarMensagemWhatsApp(numeroResponsavel, mensagem);
}
