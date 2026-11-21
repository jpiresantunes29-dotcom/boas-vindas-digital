import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O Map de tentativas é estado do módulo: cada teste importa uma cópia nova
// para não depender da ordem de execução.
async function importarLimitador() {
  vi.resetModules();
  return import("@/lib/seguranca/rateLimit");
}

describe("excedeuLimite", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T22:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("usa limite folgado o bastante para vários visitantes no mesmo Wi-Fi", async () => {
    const { LIMITE_POR_JANELA, JANELA_MS } = await importarLimitador();
    expect(LIMITE_POR_JANELA).toBe(30);
    expect(JANELA_MS).toBe(60_000);
  });

  it("permite as primeiras tentativas dentro do limite", async () => {
    const { excedeuLimite, LIMITE_POR_JANELA } = await importarLimitador();
    const ip = "192.0.2.10";
    for (let i = 0; i < LIMITE_POR_JANELA; i++) {
      expect(excedeuLimite(ip)).toBe(false);
    }
  });

  it("bloqueia depois de exceder o limite na janela de tempo", async () => {
    const { excedeuLimite, LIMITE_POR_JANELA } = await importarLimitador();
    const ip = "192.0.2.20";
    for (let i = 0; i < LIMITE_POR_JANELA; i++) {
      excedeuLimite(ip);
    }
    expect(excedeuLimite(ip)).toBe(true);
  });

  it("libera de novo depois que a janela passa", async () => {
    const { excedeuLimite, LIMITE_POR_JANELA, JANELA_MS } = await importarLimitador();
    const ip = "192.0.2.30";
    for (let i = 0; i < LIMITE_POR_JANELA; i++) excedeuLimite(ip);
    expect(excedeuLimite(ip)).toBe(true);

    vi.setSystemTime(Date.now() + JANELA_MS);
    expect(excedeuLimite(ip)).toBe(false);
  });

  it("mantém IPs diferentes com contadores independentes", async () => {
    const { excedeuLimite, LIMITE_POR_JANELA } = await importarLimitador();
    const ipA = "198.51.100.1";
    const ipB = "198.51.100.2";
    for (let i = 0; i < LIMITE_POR_JANELA; i++) excedeuLimite(ipA);
    expect(excedeuLimite(ipA)).toBe(true);
    expect(excedeuLimite(ipB)).toBe(false);
  });

  it("remove da memória os IPs inativos quando o Map fica grande", async () => {
    const { excedeuLimite, totalIpsMonitorados, MAX_IPS_ANTES_DA_LIMPEZA, JANELA_MS } =
      await importarLimitador();

    for (let i = 0; i <= MAX_IPS_ANTES_DA_LIMPEZA; i++) {
      excedeuLimite(`10.0.${Math.floor(i / 256)}.${i % 256}`);
    }
    expect(totalIpsMonitorados()).toBe(MAX_IPS_ANTES_DA_LIMPEZA + 1);

    // Um IP ainda ativo, com tentativa recente, não pode ser descartado.
    vi.setSystemTime(Date.now() + JANELA_MS - 1);
    excedeuLimite("203.0.113.50");

    vi.setSystemTime(Date.now() + 1);
    excedeuLimite("203.0.113.99");

    // Sobram só o IP ainda dentro da janela e o da chamada atual.
    expect(totalIpsMonitorados()).toBe(2);
  });

  it("não faz a limpeza enquanto o Map está abaixo do limite", async () => {
    const { excedeuLimite, totalIpsMonitorados, JANELA_MS } = await importarLimitador();
    excedeuLimite("192.0.2.40");
    excedeuLimite("192.0.2.41");

    vi.setSystemTime(Date.now() + JANELA_MS * 2);
    excedeuLimite("192.0.2.42");

    expect(totalIpsMonitorados()).toBe(3);
  });
});
