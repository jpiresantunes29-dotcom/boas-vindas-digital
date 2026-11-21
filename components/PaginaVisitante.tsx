"use client";

import { useState } from "react";
import Image from "next/image";
import { FormularioVisitante } from "@/components/formulario/FormularioVisitante";
import { TelaSucesso } from "@/components/TelaSucesso";
import { IGREJA } from "@/lib/config/igreja";

type Resultado = { nome: string; recorrente: boolean };

export function PaginaVisitante() {
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // No celular o visitante toca em "Enviar" no fim do formulário, que é bem
  // mais longo que a tela seguinte — sem isso, a tela de sucesso (ou o
  // formulário, ao voltar) apareceria fora da vista.
  function trocarTela(proximo: Resultado | null) {
    setResultado(proximo);
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10 sm:py-14">
      <header className="mb-8 flex flex-col items-center gap-4 text-center">
        <Image
          src="/logo-alianca-crista.png"
          alt={IGREJA.nomeCurto}
          width={220}
          height={70}
          priority
          className="h-auto w-[200px]"
        />
        {!resultado ? (
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-3xl font-semibold text-navy">
              Seja bem-vindo(a) à {IGREJA.nomeCurto}
            </h1>
            <p className="text-[15px] text-ink-muted">
              Leva menos de 2 minutos — é só para a gente te conhecer melhor.
            </p>
          </div>
        ) : (
          <h1 className="font-display text-3xl font-semibold text-navy">Cadastro concluído</h1>
        )}
      </header>

      {resultado ? (
        <TelaSucesso
          nome={resultado.nome}
          recorrente={resultado.recorrente}
          aoVoltar={() => trocarTela(null)}
        />
      ) : (
        <>
          <FormularioVisitante aoConcluir={trocarTela} />
          {/* Abre em nova aba para não perder o que já foi digitado no
              formulário. A tela de sucesso tem o próprio link no rodapé. */}
          <footer className="mt-auto pt-10 text-center text-xs text-ink-muted">
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener"
              className="underline underline-offset-2 hover:text-navy"
            >
              Aviso de privacidade
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </footer>
        </>
      )}
    </main>
  );
}
