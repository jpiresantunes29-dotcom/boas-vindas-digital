"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { visitanteSchema, type VisitanteInput } from "@/lib/validacao/visitanteSchema";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/client";
import { notificarNovoVisitante } from "@/lib/notificacao/enviarEmail";
import {
  lerNumerosResponsaveis,
  notificarVisitante,
  notificarResponsavel,
} from "@/lib/notificacao/enviarWhatsApp";
import { pareceBot } from "@/lib/seguranca/honeypot";
import { excedeuLimite } from "@/lib/seguranca/rateLimit";

export type ResultadoCadastro =
  | { ok: true; nome: string; recorrente: boolean }
  | {
      ok: false;
      erro: string;
      camposInvalidos?: Partial<Record<string, string>>;
    };

/** Colunas criadas por migrations/0003_consentimento_e_cep.sql. */
const COLUNAS_MIGRATION_0003 = ["cep", "aceita_whatsapp", "consentimento_privacidade_em"] as const;

const MENSAGEM_ERRO_GENERICA =
  "Não conseguimos enviar agora. Seus dados continuam aqui — toque em enviar de novo.";

/**
 * IP do visitante para o limitador de taxa. Na Vercel, `x-real-ip` é
 * preenchido pela própria plataforma com o IP de quem fez a requisição;
 * `x-forwarded-for` fica como alternativa (o primeiro valor da lista é o
 * cliente original, os seguintes são proxies intermediários).
 */
async function obterIp(): Promise<string> {
  const cabecalhos = await headers();
  const ipReal = cabecalhos.get("x-real-ip")?.trim();
  if (ipReal) return ipReal;
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

  const registro = {
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
    cep: visitante.cep || null,
    aceita_whatsapp: visitante.aceitaWhatsApp,
    // O schema só aceita o envio com o aviso de privacidade marcado: registra
    // quando o consentimento foi dado (LGPD).
    consentimento_privacidade_em: new Date().toISOString(),
    recorrente,
  };

  let { error: erroInsercao } = await supabase.from("visitantes").insert(registro);

  // Compatibilidade com bancos onde a migration 0003 ainda não foi aplicada:
  // o PostgREST responde PGRST204 quando uma coluna não existe. Em vez de
  // perder o cadastro, grava sem as colunas novas e avisa no log.
  if (erroInsercao?.code === "PGRST204") {
    console.error(
      "Colunas da migration 0003 ausentes no Supabase — rode migrations/0003_consentimento_e_cep.sql. Gravando sem cep/aceita_whatsapp/consentimento_privacidade_em.",
      erroInsercao.message
    );
    const registroLegado: Record<string, unknown> = { ...registro };
    for (const coluna of COLUNAS_MIGRATION_0003) delete registroLegado[coluna];
    ({ error: erroInsercao } = await supabase.from("visitantes").insert(registroLegado));
  }

  if (erroInsercao) {
    console.error("Falha ao gravar visitante:", erroInsercao);
    return { ok: false, erro: MENSAGEM_ERRO_GENERICA };
  }

  // Best-effort: falha no envio de notificações não deve reverter nem sinalizar
  // erro no cadastro, que já foi concluído com sucesso (RF15 / RN07).
  //
  // `after()` agenda os envios para depois da resposta e mantém a função viva
  // até terminarem. Uma Promise solta (sem await) depois do return pode ser
  // congelada junto com a função serverless na Vercel, e a mensagem se perde.
  // Cada envio é independente: `allSettled` garante que a falha de um não
  // impede os outros.
  after(async () => {
    const envios: Promise<void>[] = [notificarNovoVisitante(visitante, recorrente)];

    // WhatsApp ao visitante só com opt-in explícito no formulário.
    if (visitante.aceitaWhatsApp) {
      envios.push(notificarVisitante(visitante.nome, visitante.celular));
    }

    // Cada responsável recebe a própria mensagem, em envios independentes.
    for (const numeroResponsavel of lerNumerosResponsaveis(
      process.env.NOTIFICACAO_WHATSAPP_NUMERO
    )) {
      envios.push(notificarResponsavel(visitante, recorrente, numeroResponsavel));
    }

    const resultados = await Promise.allSettled(envios);
    for (const resultado of resultados) {
      if (resultado.status === "rejected") {
        console.error("Erro ao enviar notificação:", resultado.reason);
      }
    }
  });

  return { ok: true, nome: visitante.nome, recorrente };
}
