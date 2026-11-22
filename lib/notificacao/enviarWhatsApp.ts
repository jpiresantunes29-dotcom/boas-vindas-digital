import "server-only";
import { IGREJA } from "@/lib/config/igreja";

/**
 * Envia notificações via WhatsApp usando Evolution API.
 *
 * Evolution API é uma solução open source que permite enviar mensagens WhatsApp.
 * Documentação: https://doc.evolution-api.com/
 *
 * Para usar, você precisa:
 * 1. Deploy a Evolution API (Docker, VPS, etc.)
 * 2. Configurar as variáveis de ambiente (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE)
 *
 * O import de "server-only" garante que a chave da API nunca vá parar num
 * bundle de cliente: a build falha se este arquivo for importado por lá.
 */

/**
 * Tempo máximo de espera pela Evolution API antes de desistir do envio.
 * Generoso de propósito: o envio roda em `after()`, depois da resposta ao
 * visitante, então esperar não atrasa ninguém — e um servidor gratuito (ex.:
 * Render) que estava dormindo pode levar algumas dezenas de segundos para acordar.
 */
const TIMEOUT_MS = 25_000;

/**
 * Remove caracteres especiais e formata o número para o padrão Evolution API
 * (DDI 55 + DDD + número).
 *
 * Exemplos:
 * - "(41) 99747-9889" ou "+55 41 99747-9889" → "5541997479889"
 * - "(55) 99999-8888" (DDD 55, RS) → "5555999998888"
 *
 * Não basta olhar se começa com "55": um celular de DDD 55 sem DDI também
 * começa assim. Por isso a decisão é pelo tamanho — 10 ou 11 dígitos são
 * DDD + número (sem DDI); 12 ou 13 dígitos começando com 55 já trazem o DDI.
 */
export function formatarNumeroParaEvolution(numero: string): string {
  const somenteDigitos = numero.replace(/\D/g, "");

  if (
    (somenteDigitos.length === 12 || somenteDigitos.length === 13) &&
    somenteDigitos.startsWith("55")
  ) {
    return somenteDigitos;
  }

  if (somenteDigitos.length === 10 || somenteDigitos.length === 11) {
    return `55${somenteDigitos}`;
  }

  // Fora do padrão brasileiro esperado: envia como veio e deixa a Evolution
  // API recusar — o erro é registrado no log e não bloqueia o cadastro.
  return somenteDigitos;
}

/**
 * Corpos de erro da Evolution API podem ecoar o número de destino (ex.: quando
 * o número não tem WhatsApp). Mascara sequências longas de dígitos para não
 * gravar telefone de visitante no log do servidor.
 */
function ocultarTelefones(texto: string): string {
  return texto.replace(/\d{8,}/g, "[número omitido]").slice(0, 500);
}

/**
 * Envia uma mensagem de texto via WhatsApp (Evolution API).
 * Best-effort: se falhar, não bloqueia o fluxo de cadastro — nunca lança,
 * sempre devolve `{ sucesso: false, erro }` em caso de problema.
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
    const endpoint = `${url.replace(/\/+$/, "")}/message/sendText/${encodeURIComponent(instance)}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // A Evolution API autentica pelo header `apikey`, não por Bearer token.
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: numero,
        text: mensagem,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const erro = await res.text();
      console.error(`[WhatsApp] Erro ${res.status}: ${ocultarTelefones(erro)}`);
      return { sucesso: false, erro: `HTTP ${res.status}` };
    }

    // Sem o número no log: telefone é dado pessoal (LGPD).
    console.log("[WhatsApp] Mensagem enviada com sucesso.");
    return { sucesso: true };
  } catch (err) {
    let mensagemErro = err instanceof Error ? err.message : "Erro desconhecido";
    if (err instanceof Error && err.name === "TimeoutError") {
      mensagemErro = `Tempo esgotado (${TIMEOUT_MS} ms) aguardando a Evolution API`;
    }
    console.error(`[WhatsApp] Erro ao enviar: ${mensagemErro}`);
    return { sucesso: false, erro: mensagemErro };
  }
}

/**
 * Notifica o visitante que seu cadastro foi recebido.
 * Só deve ser chamada quando o visitante aceitou receber WhatsApp (opt-in).
 */
export async function notificarVisitante(
  nome: string,
  celular: string
): Promise<void> {
  const primeiroNome = nome.trim().split(/\s+/)[0];
  const mensagem = `Oi ${primeiroNome}! 👋\n\nRecebemos seu cadastro na ${IGREJA.nome}. Nossa equipe vai entrar em contato em breve.\n\n🙏 Que Deus te abençoe!`;

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
  // O servidor (Vercel) roda em UTC: sem o fuso explícito, um cadastro feito
  // às 20h de domingo apareceria como 23h no aviso.
  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR", { timeZone: IGREJA.fusoHorario });
  const hora = agora.toLocaleTimeString("pt-BR", {
    timeZone: IGREJA.fusoHorario,
    hour: "2-digit",
    minute: "2-digit",
  });

  const mensagem = `📋 Novo visitante em ${data} às ${hora}\n\nNome: ${nomeVisitante}\nCelular/WhatsApp: ${celularVisitante}\n\nVerifique os detalhes completos no banco de dados.`;

  await enviarMensagemWhatsApp(numeroResponsavel, mensagem);
}
