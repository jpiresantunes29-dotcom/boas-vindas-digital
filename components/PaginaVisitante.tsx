"use client";

import { useState } from "react";
import Image from "next/image";
import { FormularioVisitante } from "@/components/formulario/FormularioVisitante";
import { TelaSucesso } from "@/components/TelaSucesso";

type Resultado = { nome: string; recorrente: boolean };

export function PaginaVisitante() {
  const [resultado, setResultado] = useState<Resultado | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10 sm:py-14">
      <header className="mb-8 flex flex-col items-center gap-4 text-center">
        <Image
          src="/logo-alianca-crista.png"
          alt="Aliança Cristã"
          width={220}
          height={70}
          priority
          className="h-auto w-[200px]"
        />
        {!resultado ? (
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-3xl font-semibold text-navy">
              Seja bem-vindo(a) à Aliança Cristã
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
          aoVoltar={() => setResultado(null)}
        />
      ) : (
        <FormularioVisitante aoConcluir={setResultado} />
      )}
    </main>
  );
}
