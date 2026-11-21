import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { IGREJA, enderecoCompleto, linkWhatsApp } from "@/lib/config/igreja";

export const metadata: Metadata = {
  title: "Aviso de privacidade",
  description: `Como a ${IGREJA.nome} usa e protege os dados informados no cadastro de visitantes.`,
  alternates: { canonical: "/privacidade" },
};

const DATA_ATUALIZACAO = "novembro de 2026";

const classeLink = "underline decoration-gold underline-offset-2 hover:text-gold-text";

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-navy">{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * Aviso de privacidade (LGPD) linkado no consentimento do formulário.
 * Estático: os dados da igreja vêm de `lib/config/igreja.ts`.
 */
export default function PaginaPrivacidade() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-4 py-10 text-[15px] leading-relaxed text-ink-muted sm:py-14">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{IGREJA.nome}</p>
        <h1 className="font-display text-3xl font-semibold text-navy">Aviso de privacidade</h1>
        <p>
          Este aviso explica, em linguagem simples, como usamos os dados que você informa no
          cadastro de visitantes, de acordo com a Lei Geral de Proteção de Dados (LGPD — Lei nº
          13.709/2018).
        </p>
      </header>

      <Secao titulo="Quem cuida dos seus dados">
        <p>
          A <strong className="text-navy">{IGREJA.nome}</strong>, localizada em{" "}
          {enderecoCompleto()}, é a responsável (controladora) pelos dados do cadastro.
        </p>
      </Secao>

      <Secao titulo="Quais dados coletamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Nome completo, celular/WhatsApp e e-mail (opcional).</li>
          <li>Sexo, estado civil e data de nascimento.</li>
          <li>CEP, endereço, número, complemento, tipo de moradia, bairro e cidade.</li>
          <li>Como você conheceu a igreja e, se foi convite, quem convidou.</li>
          <li>Se você pertence a outra igreja e qual.</li>
          <li>Se deseja se unir à igreja ou receber uma visita.</li>
          <li>Seu pedido de oração (opcional).</li>
          <li>Se quer receber a confirmação do cadastro no WhatsApp.</li>
          <li>Data e hora do cadastro e do seu consentimento.</li>
        </ul>
        <p>
          Para evitar envios automáticos em massa, o endereço IP da conexão é usado só no momento
          do envio e não fica guardado no cadastro.
        </p>
      </Secao>

      <Secao titulo="Dados sobre fé são sensíveis">
        <p>
          Informações sobre sua fé — como a igreja que você frequenta e o desejo de se unir à
          nossa — e o seu pedido de oração são <strong className="text-navy">dados pessoais
          sensíveis</strong> pela LGPD (art. 5º, II), por revelarem convicção religiosa.
        </p>
        <p>
          Só tratamos essas informações com o seu consentimento, dado ao marcar a caixa de
          concordância no formulário. Os campos de outra igreja e de pedido de oração são
          opcionais.
        </p>
      </Secao>

      <Secao titulo="Para que usamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fazer o primeiro contato e dar as boas-vindas.</li>
          <li>Acompanhamento pastoral, incluindo oração por você e sua família.</li>
          <li>Organizar as visitas da nossa equipe.</li>
          <li>Enviar a confirmação do cadastro pelo WhatsApp, se você pedir.</li>
        </ul>
        <p>
          <strong className="text-navy">Nunca</strong> usamos seus dados para fins comerciais e
          nunca os vendemos.
        </p>
      </Secao>

      <Secao titulo="Quem tem acesso">
        <p>
          Apenas as pessoas da equipe da igreja autorizadas a cuidar do acolhimento e do
          acompanhamento pastoral.
        </p>
      </Secao>

      <Secao titulo="Serviços que usamos">
        <p>Para o cadastro funcionar, contamos com estes serviços, que tratam os dados em nosso nome:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-navy">Vercel</strong> — hospedagem do site.
          </li>
          <li>
            <strong className="text-navy">Supabase</strong> — banco de dados onde o cadastro fica
            guardado.
          </li>
          <li>
            <strong className="text-navy">Resend</strong> — envio do e-mail interno que avisa a
            equipe sobre um novo cadastro.
          </li>
          <li>
            <strong className="text-navy">Evolution API (WhatsApp)</strong> — envio de mensagens
            pelo WhatsApp.
          </li>
          <li>
            <strong className="text-navy">ViaCEP</strong> — busca do endereço pelo CEP. Quando você
            preenche o CEP, o seu navegador envia apenas o CEP ao ViaCEP.
          </li>
        </ul>
        <p>Alguns desses serviços podem processar dados em servidores fora do Brasil.</p>
      </Secao>

      <Secao titulo="Por quanto tempo guardamos">
        <p>
          Enquanto houver acompanhamento pastoral ou até você pedir a exclusão — o que acontecer
          primeiro.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p>Pela LGPD (art. 18), você pode, a qualquer momento:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>saber se temos dados seus e ter acesso a eles;</li>
          <li>corrigir dados incompletos ou errados;</li>
          <li>pedir a exclusão dos seus dados;</li>
          <li>
            revogar o seu consentimento — o que vale dali em diante, sem afetar o que já foi feito
            antes.
          </li>
        </ul>
        <p>
          Para pedir qualquer uma dessas coisas, fale com a gente pelo WhatsApp:{" "}
          {IGREJA.whatsapp.map((contato, indice) => (
            <span key={contato.numero}>
              <a
                href={linkWhatsApp(contato.numero)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${classeLink} text-navy`}
              >
                {contato.rotulo}
              </a>
              {indice < IGREJA.whatsapp.length - 1 ? " ou " : "."}
            </span>
          ))}
        </p>
        <p>
          Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </Secao>

      <footer className="flex flex-col gap-6 border-t border-border pt-6">
        <p className="text-sm">Atualizado em {DATA_ATUALIZACAO}.</p>
        <Link
          href="/"
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-navy/20 px-6
            text-[16px] font-semibold text-navy transition-colors hover:bg-navy/5 focus:outline-none
            focus:ring-2 focus:ring-gold/50"
        >
          Voltar ao cadastro
        </Link>
      </footer>
    </main>
  );
}
