import { describe, expect, it } from "vitest";
import { pareceBot } from "@/lib/seguranca/honeypot";

describe("pareceBot", () => {
  it("retorna falso quando o campo isca está vazio", () => {
    expect(pareceBot("")).toBe(false);
    expect(pareceBot(undefined)).toBe(false);
    expect(pareceBot(null)).toBe(false);
  });

  it("retorna verdadeiro quando o campo isca vem preenchido", () => {
    expect(pareceBot("qualquer coisa")).toBe(true);
    expect(pareceBot("   x")).toBe(true);
  });
});
