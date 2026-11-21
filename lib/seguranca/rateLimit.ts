/**
 * Limitador de taxa simples, em memória, por IP.
 *
 * Nesta escala (uma igreja, um formulário, tráfego concentrado em dois
 * cultos por semana) isso já contém picos de bots o suficiente sem exigir
 * captcha nem um serviço externo pago.
 *
 * Por que 30 por minuto (e não um número menor): os visitantes costumam
 * enviar o formulário todos ao mesmo tempo, logo depois que o QR code aparece
 * no telão, e muitos estão no Wi-Fi da igreja — ou atrás do NAT da mesma
 * operadora —, ou seja, compartilham o MESMO IP público. Um limite baixo
 * bloquearia visitantes legítimos justamente no momento de maior uso. 30 por
 * minuto comporta uma turma inteira de visitantes e ainda barra um bot
 * disparando envios em sequência.
 *
 * Limitação conhecida: como funções serverless podem escalar em múltiplas
 * instâncias, a contagem é por instância — o limite real é "até N por
 * instância que atender aquele IP", não um limite global exato. Suficiente
 * para o volume desta igreja.
 */

export const JANELA_MS = 60_000;
export const LIMITE_POR_JANELA = 30;

/**
 * Acima deste número de IPs guardados, cada chamada faz uma faxina e remove
 * os IPs sem nenhuma tentativa dentro da janela. Sem isso, uma instância que
 * fica viva por muito tempo acumularia um IP por visitante para sempre
 * (vazamento de memória).
 */
export const MAX_IPS_ANTES_DA_LIMPEZA = 1000;

const tentativasPorIp = new Map<string, number[]>();

function removerIpsInativos(agora: number): void {
  for (const [ip, tentativas] of tentativasPorIp) {
    // Os timestamps são acrescentados em ordem: basta olhar o mais recente.
    const ultima = tentativas[tentativas.length - 1];
    if (ultima === undefined || agora - ultima >= JANELA_MS) {
      tentativasPorIp.delete(ip);
    }
  }
}

export function excedeuLimite(ip: string): boolean {
  const agora = Date.now();

  if (tentativasPorIp.size > MAX_IPS_ANTES_DA_LIMPEZA) {
    removerIpsInativos(agora);
  }

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

/** Quantos IPs estão guardados em memória agora (usado nos testes). */
export function totalIpsMonitorados(): number {
  return tentativasPorIp.size;
}
