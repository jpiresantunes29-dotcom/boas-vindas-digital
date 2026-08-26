import "server-only";
import { Resend } from "resend";
import type { VisitanteValidado } from "@/lib/validacao/visitanteSchema";
import {
  ESTADO_CIVIL_ROTULOS,
  COMO_CONHECEU_ROTULOS,
  TIPO_MORADIA_ROTULOS,
} from "@/lib/validacao/visitanteSchema";

function linkWhatsApp(celular: string): string {
  return `https://wa.me/55${celular}`;
}

function montarHtml(dados: VisitanteValidado, recorrente: boolean): string {
  const linhas: string[] = [];

  linhas.push(`<p><strong>Nome:</strong> ${escapeHtml(dados.nome)}</p>`);
  linhas.push(
    `<p><strong>Celular:</strong> <a href="${linkWhatsApp(dados.celular)}">${escapeHtml(
      dados.celular
    )}</a></p>`
  );
  if (dados.email) linhas.push(`<p><strong>E-mail:</strong> ${escapeHtml(dados.email)}</p>`);
  if (dados.estadoCivil)
    linhas.push(`<p><strong>Estado civil:</strong> ${ESTADO_CIVIL_ROTULOS[dados.estadoCivil]}</p>`);
  if (dados.dataNascimento)
    linhas.push(`<p><strong>Data de nascimento:</strong> ${escapeHtml(dados.dataNascimento)}</p>`);
  linhas.push(
    `<p><strong>Endereço:</strong> ${escapeHtml(
      [
        [dados.endereco, dados.numero].filter(Boolean).join(", "),
        dados.complemento,
        dados.bairro,
        dados.cidade,
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
    .replaceAll('"', "&quot;");
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
  const apiKey = process.env.RESEND_API_KEY;
  const destinatarioPrincipal = process.env.NOTIFICACAO_EMAIL_PRINCIPAL;
  const destinatarioAdmin = process.env.NOTIFICACAO_EMAIL_ADMIN;
  const remetente = process.env.RESEND_EMAIL_REMETENTE ?? "onboarding@resend.dev";

  if (!apiKey || !destinatarioPrincipal) {
    console.error(
      "Notificação não enviada: RESEND_API_KEY ou NOTIFICACAO_EMAIL_PRINCIPAL ausente."
    );
    return;
  }

  const destinatarios = [destinatarioPrincipal, destinatarioAdmin].filter(
    (endereco): endereco is string => Boolean(endereco)
  );

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: remetente,
      to: destinatarios,
      subject: recorrente
        ? `Visitante recorrente: ${dados.nome}`
        : `Novo visitante: ${dados.nome}`,
      html: montarHtml(dados, recorrente),
    });
  } catch (erro) {
    console.error("Falha ao enviar notificação por e-mail:", erro);
  }
}
