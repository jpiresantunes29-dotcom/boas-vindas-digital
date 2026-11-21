import Link from "next/link";
import { Botao } from "@/components/ui/Botao";
import { IGREJA, enderecoCompleto, linkWhatsApp } from "@/lib/config/igreja";

type TelaSucessoProps = {
  nome: string;
  recorrente: boolean;
  aoVoltar: () => void;
};

const CLASSE_LINK = "underline decoration-gold underline-offset-2 hover:text-gold-text";

/**
 * Absorve o antigo QR "Saiba Mais" do cartão físico: depois do envio, o
 * visitante já engajado recebe os cultos e o contato da igreja aqui mesmo,
 * em vez de precisar escanear um segundo código (§15 / §20 do documento
 * de descoberta). Os dados vêm de lib/config/igreja.ts.
 */
export function TelaSucesso({ nome, recorrente, aoVoltar }: TelaSucessoProps) {
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? nome;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-2xl italic text-navy">
          Que alegria ter você aqui, {primeiroNome}!
        </p>
        <blockquote className="mx-auto max-w-sm font-display italic text-ink-muted">
          &ldquo;{IGREJA.versiculoTema.texto}&rdquo;
          <footer className="mt-2 text-sm not-italic text-gold-text">
            {IGREJA.versiculoTema.referencia}
          </footer>
        </blockquote>
        {recorrente && (
          <p className="text-sm text-ink-muted">Bom te ver de novo por aqui. 💛</p>
        )}
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
            Nossos cultos
          </p>
          {IGREJA.cultos.map((culto) => (
            <p key={culto.diaSchemaOrg} className="text-[15px] text-navy">
              <strong>
                {culto.dia}, {culto.rotuloHorario}
              </strong>{" "}
              — {culto.nome}
            </p>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
            Fale com a gente
          </p>
          <p className="text-[15px] text-navy">
            WhatsApp:{" "}
            {IGREJA.whatsapp.map((contato, indice) => (
              <span key={contato.numero}>
                <a
                  href={linkWhatsApp(contato.numero)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CLASSE_LINK}
                >
                  {contato.rotulo}
                </a>
                {indice < IGREJA.whatsapp.length - 1 && " / "}
              </span>
            ))}
          </p>
          <p className="text-[15px] text-navy">{enderecoCompleto()}</p>
          <p className="text-[15px] text-navy">
            Instagram{" "}
            <a
              href={IGREJA.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className={CLASSE_LINK}
            >
              @{IGREJA.instagram.usuario}
            </a>
          </p>
        </div>
      </div>

      <Botao variante="secundario" onClick={aoVoltar}>
        Voltar ao início
      </Botao>

      <p className="text-xs text-ink-muted">
        <Link href="/privacidade" className="underline underline-offset-2 hover:text-navy">
          Aviso de privacidade
        </Link>
      </p>
    </div>
  );
}
