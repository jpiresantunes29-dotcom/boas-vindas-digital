import type { VisitanteValidado } from "@/lib/validacao/visitanteSchema";
import {
  ESTADO_CIVIL_ROTULOS,
  COMO_CONHECEU_ROTULOS,
  TIPO_MORADIA_ROTULOS,
} from "@/lib/validacao/visitanteSchema";

/**
 * Ficha do visitante, num formato neutro (rótulo + valor), usada tanto pelo
 * e-mail (HTML) quanto pelo WhatsApp (texto) do responsável — assim os dois
 * avisos mostram sempre as mesmas informações, na mesma ordem.
 */
export type ItemFicha = {
  rotulo: string;
  valor: string;
  /** Link opcional (ex.: wa.me do celular), para o canal que suportar. */
  link?: string;
};

const SEXO_ROTULOS: Record<NonNullable<VisitanteValidado["sexo"]>, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

/** Link para abrir conversa no WhatsApp com o celular do visitante. */
export function linkWhatsAppVisitante(celular: string): string {
  return `https://wa.me/55${celular}`;
}

/**
 * "1990-05-20" → "20/05/1990". Trabalha só com a string: passar por `Date`
 * interpretaria o valor como meia-noite UTC e, no fuso de Brasília, a data
 * poderia "voltar" um dia.
 */
export function formatarData(valor: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return valor;
  const [, ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/** "81000000" → "81000-000". */
export function formatarCep(cep: string): string {
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

/** "41997479889" → "(41) 99747-9889"; "4133334444" → "(41) 3333-4444". */
export function formatarCelular(celular: string): string {
  if (celular.length === 11) return `(${celular.slice(0, 2)}) ${celular.slice(2, 7)}-${celular.slice(7)}`;
  if (celular.length === 10) return `(${celular.slice(0, 2)}) ${celular.slice(2, 6)}-${celular.slice(6)}`;
  return celular;
}

export function enderecoCompletoVisitante(dados: VisitanteValidado): string {
  return [
    [dados.endereco, dados.numero].filter(Boolean).join(", "),
    dados.complemento,
    dados.bairro,
    dados.cidade,
    dados.cep && `CEP ${formatarCep(dados.cep)}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export function montarFichaVisitante(dados: VisitanteValidado): ItemFicha[] {
  const ficha: ItemFicha[] = [];
  const adicionar = (rotulo: string, valor: string | undefined | null | false, link?: string) => {
    if (valor) ficha.push({ rotulo, valor, link });
  };

  adicionar("Nome", dados.nome);
  adicionar("Celular", dados.celular, linkWhatsAppVisitante(dados.celular));
  adicionar("Aceita receber WhatsApp", dados.aceitaWhatsApp ? "Sim" : "Não");
  adicionar("E-mail", dados.email);
  adicionar("Sexo", dados.sexo && SEXO_ROTULOS[dados.sexo]);
  adicionar("Estado civil", dados.estadoCivil && ESTADO_CIVIL_ROTULOS[dados.estadoCivil]);
  adicionar("Data de nascimento", dados.dataNascimento && formatarData(dados.dataNascimento));
  adicionar("Endereço", enderecoCompletoVisitante(dados));
  adicionar("Tipo de moradia", dados.tipoMoradia && TIPO_MORADIA_ROTULOS[dados.tipoMoradia]);
  adicionar("Como conheceu a igreja", dados.comoConheceu && COMO_CONHECEU_ROTULOS[dados.comoConheceu]);
  adicionar("Convidado por", dados.convidadoPor);
  adicionar("Pertence a outra igreja", dados.outraIgreja);
  adicionar(
    "Gostaria de",
    [dados.desejaSeUnir && "Unir-se à igreja", dados.desejaReceberVisita && "Receber visita"]
      .filter(Boolean)
      .join(" · ")
  );
  adicionar("Pedido de oração", dados.pedidoOracao);

  return ficha;
}

export const AVISO_RECORRENTE =
  "Este celular já apareceu em um cadastro anterior — visitante recorrente.";
