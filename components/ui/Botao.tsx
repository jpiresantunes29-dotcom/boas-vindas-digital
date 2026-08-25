import type { ButtonHTMLAttributes } from "react";

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario";
};

const BASE =
  "inline-flex min-h-[52px] items-center justify-center rounded-xl px-6 text-[16px] font-semibold " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTES: Record<NonNullable<BotaoProps["variante"]>, string> = {
  primario: "bg-gold text-navy hover:bg-gold-text hover:text-white",
  secundario: "border border-navy/20 text-navy hover:bg-navy/5",
};

export function Botao({ variante = "primario", className, ...props }: BotaoProps) {
  return <button className={`${BASE} ${VARIANTES[variante]} ${className ?? ""}`} {...props} />;
}
