import { describe, expect, it } from "vitest";
import { excedeuLimite } from "@/lib/seguranca/rateLimit";

describe("excedeuLimite", () => {
  it("permite as primeiras tentativas dentro do limite", () => {
    const ip = `192.0.2.${Math.floor(Math.random() * 255)}`;
    for (let i = 0; i < 5; i++) {
      expect(excedeuLimite(ip)).toBe(false);
    }
  });

  it("bloqueia depois de exceder o limite na janela de tempo", () => {
    const ip = `192.0.2.${Math.floor(Math.random() * 255)}-b`;
    for (let i = 0; i < 5; i++) {
      excedeuLimite(ip);
    }
    expect(excedeuLimite(ip)).toBe(true);
  });

  it("mantém IPs diferentes com contadores independentes", () => {
    const ipA = "198.51.100.1";
    const ipB = "198.51.100.2";
    for (let i = 0; i < 5; i++) excedeuLimite(ipA);
    expect(excedeuLimite(ipA)).toBe(true);
    expect(excedeuLimite(ipB)).toBe(false);
  });
});
