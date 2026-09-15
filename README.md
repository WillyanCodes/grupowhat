# 💬 GrupoWhat — Deploy 100% grátis

Chat de grupos estilo WhatsApp, hospedado de graça pra sempre:

- **Frontend (site):** Vercel — tier *Hobby*, grátis e sem cartão
- **Banco + auth + mídia + tempo real:** Supabase — tier *Free*, grátis e sem cartão

Custo total: **R$ 0,00**. Funciona em celular e computador.

---

## Passo 1 — criar o Supabase (banco, login Google e mídias)

1. Entre em **https://supabase.com** → **Start your project** → faça login (pode ser com a conta Google).
2. Crie um projeto novo: **New project**, um nome (ex.: `grupowhat`), uma **senha forte** (guarde!).
   Região: escolha a mais perto (ex.: `South America (São Paulo)`).
3. Vá em **Settings → API** (ou *Project Settings → API*). Copie:
   - **Project URL** → me mande de volta (é a `SUPABASE_URL`)
   - **anon public key** → me mande de volta (é a `SUPABASE_ANON_KEY`)
4. **Habilitar o login com Google:**
   - Vá em **Authentication → Sign In/Providers → Google → Enable**.
   - Ele vai pedir o *Client ID* e *Secret* do Google:

### 4a. Criar as credenciais do Google (Google Cloud)
1. Entre em **https://console.cloud.google.com** (login com a conta Google).
2. Crie um projeto (ou use um existente).
3. **APIs & Services → OAuth consent screen** → preencha o nome do app, email, salve. Não precisa de escopos.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → *Web application*.
   - **Authorized redirect URIs:** adicione
     `https://<SEU-PROJETO-REF>.supabase.co/auth/v1/callback`
     (o `<SEU-PROJETO-REF>` é o trecho do Project URL tipo `abcdefgh.supabase.co`).
5. Copie o **Client ID** e o **Client Secret** → cole no painel do Supabase (passo 4) → **Save**.

> Sem o Google Cloud configurado, ainda dá tudo certo com **email + senha** (tela já tem essa opção).

---

## Passo 2 — criar as tabelas no Supabase (SQL)

No painel do Supabase: **SQL Editor → New query**, cole o bloco abaixo e rode (**Run**):

```sql
-- app: tabelas do GrupoWhat
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code int unique not null,
  owner_id uuid references auth.users(id) on delete cascade,
  locked boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text default 'text',
  content text,
  media_url text,
  created_at timestamptz default now()
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.current_user_is_member(gid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- grupos: qualquer membro pode ler; só o criador pode criar/alterar/apagar
create policy "le grupo" on public.groups for select using (true);
create policy "cria grupo" on public.groups for insert with check (auth.uid() = owner_id);
create policy "altera grupo" on public.groups for update using (auth.uid() = owner_id);
create policy "apaga grupo" on public.groups for delete using (auth.uid() = owner_id);

-- membros: quem está no grupo enxerga; entra informando o código (RPC abaixo)
create policy "le membros" on public.group_members for select using (
  public.current_user_is_member(group_id)
);
create policy "adiciona membro" on public.group_members for insert with check (
  auth.uid() = user_id and public.current_user_is_member(group_id)
);

-- mensagens: só membros leem/escrevem
create policy "le msg" on public.messages for select using (
  public.current_user_is_member(group_id)
);
create policy "envia msg" on public.messages for insert with check (
  public.current_user_is_member(group_id)
  and (select g.owner_id = auth.uid() or not g.locked from public.groups g where g.id = group_id)
);

-- expulsar: função segura que só o dono usa (ninguém edita RLS direto)
create or replace function public.remove_member(gid uuid, uid uuid)
returns void language sql security definer as $$
  delete from public.group_members
  where group_id = gid and user_id = uid
    and exists (select 1 from public.groups where id = gid and owner_id = auth.uid());
$$;

-- entrar pelo código: função segura usada no app
create or replace function public.join_by_code(p_code int, p_user uuid default auth.uid())
returns uuid language sql security definer as $$
  insert into public.group_members (group_id, user_id)
  select g.id, p_user from public.groups g where g.code = p_code
  on conflict (group_id, user_id) do nothing
  returning group_id;
$$;
```

---

## Passo 3 — rodar local / conectar o código

1. Abra a pasta deste projeto.
2. Crie o arquivo `.env.local` com:
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA-ANON-KEY-PUBLICA
   ```
   (coloque o Project URL e a anon key do Passo 1)
3. Teste local: `npm install` e `npm run dev` → abra o endereço que aparecer.

> **Apenas o email `willyanrossanelliwress2703@gmail.com` tem o 👑 (pode criar/expulsar/travar grupos).**
> Qualquer outro usuário que clicar em "+ Novo" verá: *“Apenas Willyan pode criar grupos.”*

---

## Passo 4 — publicar o site de graça no Vercel

1. Suba a pasta em um repositório **GitHub** (crie um repositório privado e envie os arquivos).
   - **Não** suba o `.env.local` — ele fica fora por conta do `.gitignore`.
2. Entre em **https://vercel.com** → **Add New → Project** → escolha o repositório.
3. Em **Build & Deployment Settings**, adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL` = seu Project URL
   - `VITE_SUPABASE_ANON_KEY` = sua anon key
4. Clique em **Deploy**. Em ~1 minuto o site está no ar com um link tipo `seu-app.vercel.app` — grátis.

> Depois de publicado, volte ao Supabase. Em **Authentication → URL Configuration**,
> adicione a URL do site (ex.: `https://seu-app.vercel.app`) em **Site URL** e
> **Redirect URLs** adicione `https://seu-app.vercel.app/**`.

---

## Como funciona (regras definidas)

| Ação | Quem pode |
|---|---|
| Criar grupo (sorteia nº de 4 dígitos) | 👑 só o Willyan |
| Ver/entrar com nº do grupo | qualquer usuário |
| Expulsar pessoa | 👑 só o Willyan |
| Somente admin envia msg (travar grupo) | 👑 só o Willyan |
| Alterar tema (6 cores) / claro / escuro | todos |
| Enviar imagem / vídeo / áudio | todos |
| Chamada de voz / vídeo | todos (par a par) |

## Limites do plano grátis (Supabase)
- 500 MB de banco, 1 GB de mídia, 50 mil usuários ativos/mês — mais que suficiente pra começar.
- Chamadas de voz/vídeo funcionam **par a par** (com mesma rede fica perfeito; em redes diferentes
  pode demorar a conectar — o plano grátis não tem servidor TURN de relé).

Feito com ❤️ para o Willyan. GrupoWhat, v1.0.