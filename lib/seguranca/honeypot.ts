/**
 * Campo isca invisível ao visitante humano (ver `empresa` no schema).
 * Bots que preenchem todos os campos de um formulário automaticamente
 * costumam preencher este também — qualquer valor aqui é sinal de spam.
 */
export function pareceBot(valorCampoIsca: string | undefined | null): boolean {
  return Boolean(valorCampoIsca && valorCampoIsca.trim().length > 0);
}
