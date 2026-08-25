-- Tabela única da Fase 1: cadastro de visitantes.
-- Ver documento de descoberta (§12) para o raciocínio por trás de cada campo.

create table if not exists public.visitantes (
  id uuid primary key default gen_random_uuid(),

  -- Contato
  nome text not null,
  celular text not null,
  email text,

  -- Dados pessoais (obrigatoriedade confirmada pela igreja)
  sexo text check (sexo in ('masculino', 'feminino')),
  estado_civil text check (
    estado_civil in ('solteiro', 'namorando', 'casado', 'viuvo', 'divorciado')
  ),
  data_nascimento date not null,

  -- Endereço (obrigatório — usado pela equipe para organizar visitas)
  endereco text not null,
  bairro text,
  cidade text,

  -- Como chegou até a igreja
  como_conheceu text check (
    como_conheceu in ('redes_sociais', 'convite', 'internet', 'outro')
  ),
  convidado_por text,
  outra_igreja text,

  -- O que o visitante gostaria (ao menos uma marcação é obrigatória)
  deseja_se_unir boolean not null default false,
  deseja_receber_visita boolean not null default false,
  constraint gostaria_de_pelo_menos_uma_opcao
    check (deseja_se_unir or deseja_receber_visita),

  -- Pedido de oração (opcional)
  pedido_oracao text,

  -- Acompanhamento pastoral (editado pela equipe, não pelo visitante)
  recorrente boolean not null default false,
  contatado boolean not null default false,
  contatado_em timestamptz,
  observacoes_internas text,

  -- "Data da visita" — sempre gerada pelo servidor, nunca enviada pelo cliente
  created_at timestamptz not null default now()
);

create index if not exists visitantes_created_at_idx on public.visitantes (created_at desc);
create index if not exists visitantes_celular_idx on public.visitantes (celular);
create index if not exists visitantes_contatado_idx on public.visitantes (contatado);

comment on table public.visitantes is
  'Cadastros de visitantes recebidos pelo formulário digital de boas-vindas.';
comment on column public.visitantes.created_at is
  'Data/hora do cadastro, gerada pelo servidor — equivale à antiga "data da visita" da folha física.';
comment on column public.visitantes.recorrente is
  'true quando o celular já existia em um cadastro anterior no momento do envio (RN10).';

-- Row Level Security: a tabela fica fechada ao acesso anônimo. Toda leitura e
-- escrita passa pela Server Action, que usa a service role key (nunca exposta
-- ao navegador). Não há política de insert/select para o papel "anon".
alter table public.visitantes enable row level security;
