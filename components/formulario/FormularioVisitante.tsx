"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  visitanteSchema,
  SEXO_OPCOES,
  ESTADO_CIVIL_OPCOES,
  ESTADO_CIVIL_ROTULOS,
  COMO_CONHECEU_OPCOES,
  COMO_CONHECEU_ROTULOS,
  type VisitanteInput,
} from "@/lib/validacao/visitanteSchema";
import { cadastrarVisitante } from "@/app/actions/visitantes";
import { Campo } from "@/components/ui/Campo";
import { OpcaoToggle } from "@/components/ui/OpcaoToggle";
import { Botao } from "@/components/ui/Botao";
import { classeInput, classeTextarea } from "@/components/ui/estilos";

const VALORES_INICIAIS: VisitanteInput = {
  nome: "",
  celular: "",
  email: "",
  sexo: undefined,
  estadoCivil: undefined,
  dataNascimento: "",
  endereco: "",
  bairro: "",
  cidade: "Curitiba",
  comoConheceu: undefined,
  convidadoPor: "",
  outraIgreja: "",
  desejaSeUnir: false,
  desejaReceberVisita: false,
  pedidoOracao: "",
  empresa: "",
};

type FormularioVisitanteProps = {
  aoConcluir: (resultado: { nome: string; recorrente: boolean }) => void;
};

export function FormularioVisitante({ aoConcluir }: FormularioVisitanteProps) {
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VisitanteInput>({
    resolver: zodResolver(visitanteSchema),
    defaultValues: VALORES_INICIAIS,
  });

  const comoConheceu = watch("comoConheceu");

  const aoSubmeter = handleSubmit(async (dados) => {
    setErroEnvio(null);
    try {
      const resultado = await cadastrarVisitante(dados);
      if (resultado.ok) {
        aoConcluir({ nome: resultado.nome, recorrente: resultado.recorrente });
        return;
      }
      if (resultado.camposInvalidos) {
        for (const [campo, mensagem] of Object.entries(resultado.camposInvalidos)) {
          setError(campo as keyof VisitanteInput, { message: mensagem });
        }
      }
      setErroEnvio(resultado.erro);
    } catch {
      setErroEnvio(
        "Não conseguimos enviar agora. Seus dados continuam aqui — toque em enviar de novo."
      );
    }
  });

  return (
    <form onSubmit={aoSubmeter} noValidate className="flex flex-col gap-10">
      {/* Honeypot: invisível e fora da ordem de tabulação — só um bot preenche. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="empresa">Deixe este campo em branco</label>
        <input id="empresa" type="text" tabIndex={-1} autoComplete="off" {...register("empresa")} />
      </div>

      <section className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-navy">Seus dados</h2>

        <Campo id="nome" rotulo="Nome completo" obrigatorio erro={errors.nome?.message}>
          <input
            id="nome"
            type="text"
            autoComplete="name"
            className={classeInput}
            aria-invalid={Boolean(errors.nome)}
            aria-describedby={errors.nome ? "nome-erro" : undefined}
            {...register("nome")}
          />
        </Campo>

        <Campo id="celular" rotulo="Celular / WhatsApp" obrigatorio erro={errors.celular?.message}>
          <input
            id="celular"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(41) 99999-9999"
            className={classeInput}
            aria-invalid={Boolean(errors.celular)}
            aria-describedby={errors.celular ? "celular-erro" : undefined}
            {...register("celular")}
          />
        </Campo>

        <Campo id="email" rotulo="E-mail (opcional)" erro={errors.email?.message}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={classeInput}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-erro" : undefined}
            {...register("email")}
          />
        </Campo>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-navy">Um pouco sobre você</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[15px] font-medium text-navy">Sexo</legend>
          <div className="grid grid-cols-2 gap-3">
            <OpcaoToggle rotulo="Masculino" type="radio" value={SEXO_OPCOES[0]} {...register("sexo")} />
            <OpcaoToggle rotulo="Feminino" type="radio" value={SEXO_OPCOES[1]} {...register("sexo")} />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[15px] font-medium text-navy">Estado civil</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ESTADO_CIVIL_OPCOES.map((opcao) => (
              <OpcaoToggle
                key={opcao}
                rotulo={ESTADO_CIVIL_ROTULOS[opcao]}
                type="radio"
                value={opcao}
                {...register("estadoCivil")}
              />
            ))}
          </div>
        </fieldset>

        <Campo
          id="dataNascimento"
          rotulo="Data de nascimento"
          obrigatorio
          erro={errors.dataNascimento?.message}
        >
          <input
            id="dataNascimento"
            type="date"
            className={classeInput}
            aria-invalid={Boolean(errors.dataNascimento)}
            aria-describedby={errors.dataNascimento ? "dataNascimento-erro" : undefined}
            {...register("dataNascimento")}
          />
        </Campo>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-navy">Onde te encontrar</h2>
        <p className="-mt-3 text-sm text-ink-muted">
          Usamos para organizar as visitas da nossa equipe.
        </p>

        <Campo id="endereco" rotulo="Endereço" obrigatorio erro={errors.endereco?.message}>
          <input
            id="endereco"
            type="text"
            autoComplete="street-address"
            className={classeInput}
            aria-invalid={Boolean(errors.endereco)}
            aria-describedby={errors.endereco ? "endereco-erro" : undefined}
            {...register("endereco")}
          />
        </Campo>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo id="bairro" rotulo="Bairro (opcional)" erro={errors.bairro?.message}>
            <input id="bairro" type="text" className={classeInput} {...register("bairro")} />
          </Campo>
          <Campo id="cidade" rotulo="Cidade (opcional)" erro={errors.cidade?.message}>
            <input id="cidade" type="text" className={classeInput} {...register("cidade")} />
          </Campo>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-navy">Sobre sua visita</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[15px] font-medium text-navy">Como conheceu a igreja?</legend>
          <div className="grid grid-cols-2 gap-3">
            {COMO_CONHECEU_OPCOES.map((opcao) => (
              <OpcaoToggle
                key={opcao}
                rotulo={COMO_CONHECEU_ROTULOS[opcao]}
                type="radio"
                value={opcao}
                {...register("comoConheceu")}
              />
            ))}
          </div>
        </fieldset>

        {comoConheceu === "convite" && (
          <Campo
            id="convidadoPor"
            rotulo="Nome e telefone de quem convidou"
            obrigatorio
            erro={errors.convidadoPor?.message}
          >
            <input
              id="convidadoPor"
              type="text"
              className={classeInput}
              aria-invalid={Boolean(errors.convidadoPor)}
              aria-describedby={errors.convidadoPor ? "convidadoPor-erro" : undefined}
              {...register("convidadoPor")}
            />
          </Campo>
        )}

        <Campo
          id="outraIgreja"
          rotulo="Pertence a alguma igreja? Qual? (opcional)"
          erro={errors.outraIgreja?.message}
        >
          <input id="outraIgreja" type="text" className={classeInput} {...register("outraIgreja")} />
        </Campo>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-navy">Como podemos te ajudar</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[15px] font-medium text-navy">
            Gostaria de <span aria-hidden="true" className="text-gold-text">*</span>
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <OpcaoToggle rotulo="Me unir a essa igreja" {...register("desejaSeUnir")} />
            <OpcaoToggle rotulo="Receber uma visita" {...register("desejaReceberVisita")} />
          </div>
          {errors.desejaSeUnir && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-error">
              <span aria-hidden="true">⚠</span>
              <span>{errors.desejaSeUnir.message}</span>
            </p>
          )}
        </fieldset>

        <Campo id="pedidoOracao" rotulo="Pedido de oração (opcional)" erro={errors.pedidoOracao?.message}>
          <textarea
            id="pedidoOracao"
            className={classeTextarea}
            placeholder="Abra seu coração — estaremos orando por você e sua família."
            {...register("pedidoOracao")}
          />
        </Campo>
      </section>

      {erroEnvio && (
        <p role="alert" className="rounded-xl border border-error bg-error-soft px-4 py-3 text-sm text-error">
          {erroEnvio}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-cream/95 px-4 py-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Botao type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Enviando…" : "Enviar"}
        </Botao>
      </div>
    </form>
  );
}
