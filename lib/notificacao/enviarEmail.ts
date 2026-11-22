import "server-only";
import { Resend } from "resend";
import type { VisitanteValidado } from "@/lib/validacao/visitanteSchema";
import {
  ESTADO_CIVIL_ROTULOS,
  COMO_CONHECEU_ROTULOS,
  TIPO_MORADIA_ROTULOS,
} from "@/lib/validacao/visitanteSchema";

const SEXO_ROTULOS: Record<NonNullable<VisitanteValidado["sexo"]>, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

function linkWhatsApp(celular: string): string {
  return `https://wa.me/55${celular}`;
}

/**
 * "1990-05-20" → "20/05/1990". Trabalha só com a string: passar por `Date`
 * interpretaria o valor como meia-noite UTC e, no fuso de Brasília, a data
 * poderia "voltar" um dia.
 */
function formatarData(valor: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return valor;
  const [, ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/** "81000000" → "81000-000". */
function formatarCep(cep: string): string {
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

function montarHtml(dados: VisitanteValidado, recorrente: boolean): string {
  const linhas: string[] = [];

  linhas.push(`<p><strong>Nome:</strong> ${escapeHtml(dados.nome)}</p>`);
  linhas.push(
    `<p><strong>Celular:</strong> <a href="${linkWhatsApp(dados.celular)}">${escapeHtml(
      dados.celular
    )}</a></p>`
  );
  linhas.push(
    `<p><strong>Aceita receber WhatsApp:</strong> ${dados.aceitaWhatsApp ? "Sim" : "Não"}</p>`
  );
  if (dados.email) linhas.push(`<p><strong>E-mail:</strong> ${escapeHtml(dados.email)}</p>`);
  if (dados.sexo) linhas.push(`<p><strong>Sexo:</strong> ${SEXO_ROTULOS[dados.sexo]}</p>`);
  if (dados.estadoCivil)
    linhas.push(`<p><strong>Estado civil:</strong> ${ESTADO_CIVIL_ROTULOS[dados.estadoCivil]}</p>`);
  if (dados.dataNascimento)
    linhas.push(
      `<p><strong>Data de nascimento:</strong> ${escapeHtml(formatarData(dados.dataNascimento))}</p>`
    );
  linhas.push(
    `<p><strong>Endereço:</strong> ${escapeHtml(
      [
        [dados.endereco, dados.numero].filter(Boolean).join(", "),
        dados.complemento,
        dados.bairro,
        dados.cidade,
        dados.cep && `CEP ${formatarCep(dados.cep)}`,
      ]
        .filter(Boolean)
        .join(", ")
    )}</p>`
  );
  if (dados.tipoMoradia)
    linhas.push(`<p><strong>Tipo de moradia:</strong> ${TIPO_MORADIA_ROTULOS[dados.tipoMoradia]}</p>`);
  if (dados.comoConheceu)
    linhas.push(`<p><strong>Como conheceu a igreja:</strong> ${COMO_CONHECEU_ROTULOS[dados.comoConheceu]}</p>`);
  if (dados.convidadoPor)
    linhas.push(`<p><strong>Convidado por:</strong> ${escapeHtml(dados.convidadoPor)}</p>`);
  if (dados.outraIgreja)
    linhas.push(`<p><strong>Pertence a outra igreja:</strong> ${escapeHtml(dados.outraIgreja)}</p>`);

  const desejos = [
    dados.desejaSeUnir && "Unir-se à igreja",
    dados.desejaReceberVisita && "Receber visita",
  ].filter(Boolean);
  linhas.push(`<p><strong>Gostaria de:</strong> ${desejos.join(" · ")}</p>`);

  if (dados.pedidoOracao)
    linhas.push(`<p><strong>Pedido de oração:</strong> ${escapeHtml(dados.pedidoOracao)}</p>`);

  if (recorrente)
    linhas.push(
      `<p style="color:#946A08"><strong>⟳ Este celular já apareceu em um cadastro anterior — visitante recorrente.</strong></p>`
    );

  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#16213E;line-height:1.6">
    <h2 style="margin-bottom:4px">Novo cadastro de visitante</h2>
    ${linhas.join("\n")}
  </div>`;
}

function escapeHtml(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Notifica os responsáveis por e-mail. Best-effort (RF15/RN07): qualquer
 * falha aqui é registrada no log do servidor, nunca propagada para quem
 * chamou — o cadastro no banco já está concluído e não deve ser desfeito
 * nem sinalizado como erro por causa de um problema no envio do aviso.
 */
export async function notificarNovoVisitante(
  dados: VisitanteValidado,
  recorrente: boolean
): Promise<void> {
  const apiKey = lerEnv("RESEND_API_KEY");
  // `||` e não `??`: uma variável criada vazia na Vercel chega como "" e
  // derrubaria o envio com um remetente em branco.
  const remetente = lerEnv("RESEND_EMAIL_REMETENTE") || REMETENTE_PADRAO;
  const destinatarios = [
    ...new Set(
      [lerEnv("NOTIFICACAO_EMAIL_PRINCIPAL"), lerEnv("NOTIFICACAO_EMAIL_ADMIN")].filter(
        (endereco): endereco is string => Boolean(endereco)
      )
    ),
  ];

  if (!apiKey || destinatarios.length === 0) {
    console.error(
      "[E-mail] Notificação não enviada: RESEND_API_KEY ou NOTIFICACAO_EMAIL_PRINCIPAL ausente."
    );
    return;
  }

  const resend = new Resend(apiKey);
  const assunto = recorrente
    ? `Visitante recorrente: ${dados.nome}`
    : `Novo visitante: ${dados.nome}`;
  const html = montarHtml(dados, recorrente);

  // Um envio por destinatário: se um endereço for recusado (ex.: o domínio de
  // testes resend.dev só entrega para o e-mail dono da conta), os outros
  // continuam recebendo.
  await Promise.all(
    destinatarios.map(async (destinatario) => {
      try {
        // O SDK do Resend não lança exceção em erro da API (chave inválida,
        // remetente não verificado, cota estourada...): devolve `{ data, error }`.
        const { data, error } = await resend.emails.send({
          from: remetente,
          to: [destinatario],
          subject: assunto,
          html,
        });

        if (error) {
          console.error(
            `[E-mail] Falha ao enviar para ${mascararEmail(destinatario)} (remetente ${remetente}):`,
            error
          );
          return;
        }
        console.info(
          `[E-mail] Aviso enviado para ${mascararEmail(destinatario)} (id ${data?.id ?? "?"}).`
        );
      } catch (erro) {
        // Falhas de rede ou inesperadas do SDK.
        console.error(`[E-mail] Falha ao enviar para ${mascararEmail(destinatario)}:`, erro);
      }
    })
  );
}

const REMETENTE_PADRAO = "onboarding@resend.dev";

/** Lê uma variável de ambiente sem espaços nas pontas; vazia vira `undefined`. */
function lerEnv(nome: string): string | undefined {
  const valor = process.env[nome]?.trim();
  return valor ? valor : undefined;
}

/** "pastor@exemplo.com" → "p***@exemplo.com" — identifica sem expor no log. */
export function mascararEmail(endereco: string): string {
  const [usuario, dominio] = endereco.split("@");
  if (!dominio) return "***";
  return `${usuario.slice(0, 1)}***@${dominio}`;
}
