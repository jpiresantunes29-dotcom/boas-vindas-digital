import type { ReactNode } from "react";

type CampoProps = {
  id: string;
  rotulo: string;
  erro?: string;
  obrigatorio?: boolean;
  dica?: string;
  children: ReactNode;
};

/**
 * Envelope de label + controle + mensagem de erro. O input filho é
 * responsável por receber `id={id}`, `aria-invalid` e `aria-describedby`
 * apontando para `${id}-erro` — mantém o componente simples, sem "mágica"
 * de contexto para conectar os dois.
 */
export function Campo({ id, rotulo, erro, obrigatorio, dica, children }: CampoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-medium text-navy">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden="true" className="text-gold-text">
            {" "}
            *
          </span>
        )}
      </label>
      {dica && (
        <p id={`${id}-dica`} className="-mt-1 text-sm text-ink-muted">
          {dica}
        </p>
      )}
      {children}
      {erro && (
        <p id={`${id}-erro`} role="alert" className="flex items-start gap-1.5 text-sm text-error">
          <span aria-hidden="true">⚠</span>
          <span>{erro}</span>
        </p>
      )}
    </div>
  );
}
