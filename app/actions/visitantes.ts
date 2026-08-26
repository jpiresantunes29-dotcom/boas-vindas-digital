"use server";

import { headers } from "next/headers";
import { visitanteSchema, type VisitanteInput } from "@/lib/validacao/visitanteSchema";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/client";
import { notificarNovoVisitante } from "@/lib/notificacao/enviarEmail";
import { notificarVisitante, notificarResponsavel } from "@/lib/notificacao/enviarWhatsApp";
import { pareceBot } from "@/lib/seguranca/honeypot";
import { excedeuLimite } from "@/lib/seguranca/rateLimit";

export type ResultadoCadastro =
  | { ok: true; nome: string; recorrente: boolean }
  | {
      ok: false;
      erro: string;
      camposInvalidos?: Partial<Record<string, string>>;
    };

const MENSAGEM_ERRO_GENERICA =
  "Não conseguimos enviar agora. Seus dados continuam aqui — toque em enviar de novo.";

async function obterIp(): Promise<string> {
  const cabecalhos = await headers();
  const encaminhado = cabecalhos.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || "desconhecido";
}

export async function cadastrarVisitante(dados: VisitanteInput): Promise<ResultadoCadastro> {
  const ip = await obterIp();
  if (excedeuLimite(ip)) {
    return {
      ok: false,
      erro: "Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.",
    };
  }

  if (pareceBot(dados.empresa)) {
    // Resposta genérica — não revela ao remetente que o honeypot foi detectado.
    return { ok: false, erro: MENSAGEM_ERRO_GENERICA };
  }

  const resultado = visitanteSchema.safeParse(dados);
  if (!resultado.success) {
    const camposInvalidos: Record<string, string> = {};
    for (const problema of resultado.error.issues) {
      const campo = String(problema.path[0] ?? "form");
      if (!camposInvalidos[campo]) camposInvalidos[campo] = problema.message;
    }
    return {
      ok: false,
      erro: "Alguns campos precisam de atenção.",
      camposInvalidos,
    };
  }

  const visitante = resultado.data;

  let supabase: ReturnType<typeof criarClienteSupabaseAdmin>;
  try {
    supabase = criarClienteSupabaseAdmin();
  } catch (erro) {
    console.error("Supabase não configurado:", erro);
    return { ok: false, erro: MENSAGEM_ERRO_GENERICA };
  }

  const { count, error: erroConsulta } = await supabase
    .from("visitantes")
    .select("id", { count: "exact", head: true })
    .eq("celular", visitante.celular);

  if (erroConsulta) {
    console.error("Falha ao consultar visitantes existentes:", erroConsulta);
  }
  const recorrente = (count ?? 0) > 0;

  const { error: erroInsercao } = await supabase.from("visitantes").insert({
    nome: visitante.nome,
    celular: visitante.celular,
    email: visitante.email || null,
    sexo: visitante.sexo ?? null,
    estado_civil: visitante.estadoCivil ?? null,
    data_nascimento: visitante.dataNascimento,
    endereco: visitante.endereco,
    numero: visitante.numero,
    complemento: visitante.complemento || null,
    tipo_moradia: visitante.tipoMoradia ?? null,
    bairro: visitante.bairro || null,
    cidade: visitante.cidade || null,
    como_conheceu: visitante.comoConheceu ?? null,
    convidado_por: visitante.convidadoPor || null,
    outra_igreja: visitante.outraIgreja || null,
    deseja_se_unir: visitante.desejaSeUnir,
    deseja_receber_visita: visitante.desejaReceberVisita,
    pedido_oracao: visitante.pedidoOracao || null,
    recorrente,
  });

  if (erroInsercao) {
    console.error("Falha ao gravar visitante:", erroInsercao);
    return { ok: false, erro: MENSAGEM_ERRO_GENERICA };
  }

  // Best-effort: falha no envio de notificações não deve reverter nem sinalizar
  // erro no cadastro, que já foi concluído com sucesso (RF15 / RN07).
  // Tenta enviar por e-mail e WhatsApp em paralelo.
  Promise.all([
    notificarNovoVisitante(visitante, recorrente),
    notificarVisitante(visitante.nome, visitante.celular),
    notificarResponsavel(
      visitante.nome,
      visitante.celular,
      process.env.NOTIFICACAO_WHATSAPP_NUMERO || ""
    ),
  ]).catch((err) => {
    console.error("Erro ao enviar notificações:", err);
  });

  return { ok: true, nome: visitante.nome, recorrente };
}
