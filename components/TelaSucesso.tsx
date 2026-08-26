import { Botao } from "@/components/ui/Botao";

type TelaSucessoProps = {
  nome: string;
  recorrente: boolean;
  aoVoltar: () => void;
};

const WHATSAPP_NUMEROS = [
  { rotulo: "47 98845-5100", link: "https://wa.me/5547988455100" },
  { rotulo: "41 99747-9889", link: "https://wa.me/5541997479889" },
];

const INSTAGRAM_URL = "https://www.instagram.com/aliancacristacuritiba";

/**
 * Absorve o antigo QR "Saiba Mais" do cartão físico: depois do envio, o
 * visitante já engajado recebe os cultos e o contato da igreja aqui mesmo,
 * em vez de precisar escanear um segundo código (§15 / §20 do documento
 * de descoberta).
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
          &ldquo;Há um só corpo e um só Espírito, como também fostes chamados em uma só
          esperança da vossa vocação; um só Senhor, uma só fé, um só batismo; um só Deus e Pai
          de todos, o qual é sobre todos, e por todos, e em todos.&rdquo;
          <footer className="mt-2 text-sm not-italic text-gold-text">Efésios 4:4-6</footer>
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
          <p className="text-[15px] text-navy">
            <strong>Quarta-feira, 20h</strong> — Culto TOPP
          </p>
          <p className="text-[15px] text-navy">
            <strong>Domingo, 19h</strong> — Culto da Família
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
            Fale com a gente
          </p>
          <p className="text-[15px] text-navy">
            WhatsApp:{" "}
            {WHATSAPP_NUMEROS.map((numero, indice) => (
              <span key={numero.link}>
                <a
                  href={numero.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-gold underline-offset-2 hover:text-gold-text"
                >
                  {numero.rotulo}
                </a>
                {indice < WHATSAPP_NUMEROS.length - 1 && " / "}
              </span>
            ))}
          </p>
          <p className="text-[15px] text-navy">
            R. Dep. Cunha Bueno, 352 — Cidade Industrial de Curitiba
          </p>
          <p className="text-[15px] text-navy">
            Instagram{" "}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-gold underline-offset-2 hover:text-gold-text"
            >
              @aliancacristacuritiba
            </a>
          </p>
        </div>
      </div>

      <Botao variante="secundario" onClick={aoVoltar}>
        Voltar ao início
      </Botao>
    </div>
  );
}
