import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type OpcaoToggleProps = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
};

/**
 * Botão grande de seleção (rádio ou checkbox por baixo, para teclado e
 * leitor de tela funcionarem normalmente) — substitui os checkboxes
 * pequenos do papel por um alvo de toque confortável no celular.
 *
 * Usa forwardRef explicitamente: o react-hook-form precisa do ref chegando
 * até o <input> real para ler seu valor de forma não controlada.
 */
export const OpcaoToggle = forwardRef<HTMLInputElement, OpcaoToggleProps>(function OpcaoToggle(
  { rotulo, className, type = "checkbox", ...props },
  ref
) {
  return (
    <label
      className={`flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border border-border
        bg-white px-4 text-center text-[15px] font-medium text-navy transition-colors
        has-[:checked]:border-gold has-[:checked]:bg-gold-soft has-[:focus-visible]:ring-2
        has-[:focus-visible]:ring-gold/40 ${className ?? ""}`}
    >
      <input ref={ref} type={type} {...props} className="sr-only" />
      {rotulo}
    </label>
  );
});
