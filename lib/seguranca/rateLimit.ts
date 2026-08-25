/**
 * Limitador de taxa simples, em memória, por IP.
 *
 * Nesta escala (uma igreja, um formulário, tráfego concentrado em dois
 * cultos por semana) isso já contém picos de bots o suficiente sem exigir
 * captcha nem um serviço externo pago. Limitação conhecida: como funções
 * serverless podem escalar em múltiplas instâncias, a contagem é por
 * instância — o limite real é "até N por instância que atender aquele IP",
 * não um limite global exato. Suficiente para o volume desta igreja.
 */

const JANELA_MS = 60_000;
const LIMITE_POR_JANELA = 5;

const tentativasPorIp = new Map<string, number[]>();

export function excedeuLimite(ip: string): boolean {
  const agora = Date.now();
  const tentativas = (tentativasPorIp.get(ip) ?? []).filter(
    (timestamp) => agora - timestamp < JANELA_MS
  );

  if (tentativas.length >= LIMITE_POR_JANELA) {
    tentativasPorIp.set(ip, tentativas);
    return true;
  }

  tentativas.push(agora);
  tentativasPorIp.set(ip, tentativas);
  return false;
}
