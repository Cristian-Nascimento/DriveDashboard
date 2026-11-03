# Publicar na Vercel + Supabase (MVP)

O app roda na **Vercel** e o banco é um **Postgres do Supabase** (plano gratuito). As tabelas são criadas automaticamente a cada deploy (`vercel-build` roda `prisma migrate deploy`).

## 1. Criar o banco no Supabase

1. Em [supabase.com](https://supabase.com) crie um projeto (região **South America (São Paulo)**). Guarde a **senha do banco**; prefira uma sem caracteres especiais.
2. Clique em **Connect** (topo da página do projeto) e copie duas strings, na aba **ORM → Prisma** ou em **Connection string**:
   - **Transaction pooler** (porta `6543`) → será o `DATABASE_URL`
   - **Session pooler** (porta `5432`, mesmo host `...pooler.supabase.com`) → será o `DIRECT_URL`

   Use o *Session pooler* no `DIRECT_URL` (e não o host `db.xxx.supabase.co`), porque a conexão direta do Supabase é só IPv6 e o build da Vercel pode não alcançá-la.
3. Monte as duas URLs, trocando `[SENHA]` pela senha do banco:

```
DATABASE_URL = postgresql://postgres.PROJETO:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL   = postgresql://postgres.PROJETO:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

(Copie o host e o usuário exatos do painel; os de cima são só o formato. Se a senha tiver `@`, `#`, `/` etc., codifique: `@`→`%40`, `#`→`%23`, `/`→`%2F`.)

## 2. Subir o código para o GitHub

Crie um repositório **privado** e envie o projeto. O `.env` está no `.gitignore` e não vai junto.

## 3. Criar o projeto na Vercel

1. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório (autorize o GitHub só para esse repo).
2. Framework: Next.js (detectado sozinho). Não mude o build command: o `vercel-build` do `package.json` é usado automaticamente.
3. Em **Environment Variables** adicione:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | URL do Transaction pooler (passo 1) |
| `DIRECT_URL` | URL do Session pooler (passo 1) |
| `SESSION_SECRET` | string aleatória longa (`openssl rand -hex 32`) |
| `ALLOW_REGISTER` | `true` (até criar a conta) |
| `TZ` | `America/Sao_Paulo` |

4. Clique em **Deploy**. O endereço será `https://NOME.vercel.app`.

## 4. Depois do primeiro deploy

1. Abra `https://NOME.vercel.app/cadastro` e crie a conta do seu irmão.
2. Em **Settings → Environment Variables**, mude `ALLOW_REGISTER` para `false`, adicione `APP_URL=https://NOME.vercel.app` e faça **Redeploy**.
3. (Opcional) para o e-mail de recuperação de senha, adicione `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (veja `.env.example`). Sem isso, a recuperação não envia e-mail em produção.

## Segurança no Supabase (RLS)

O app **não usa** `NEXT_PUBLIC_SUPABASE_URL` nem a chave publishable: acessa o banco só pelo Prisma. Não coloque essas variáveis na Vercel.

A migração `0002_enable_rls` ativa o RLS em todas as tabelas, sem policies, para que a API REST do Supabase (que usa a chave publishable) não consiga ler nem gravar nada. O Prisma continua funcionando porque conecta como dono das tabelas.

- Se criar tabelas novas, ative o RLS nelas também (uma nova migração com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- Opcional: em **Project Settings → Data API**, desative a Data API, já que o app não a usa.
- Nunca use a chave `service_role` ou `secret` em variável `NEXT_PUBLIC_*`.

## Limitações do MVP

- **Plano Hobby da Vercel é só para uso pessoal/não comercial.** Para cobrar assinatura de outros motoristas será preciso o plano Pro.
- **Supabase gratuito pausa o projeto após ~7 dias sem acesso.** Se pausar, reative no painel. Uso diário não pausa.
- **Limite de tentativas de login é em memória**, então na Vercel (serverless) protege só parcialmente. Para o SaaS, trocar por um contador no banco ou Redis.
- Não use o `DATABASE_URL` do pooler para migrar manualmente; para isso use o `DIRECT_URL`.

## Rodar migrações manualmente (opcional)

```bash
npx prisma migrate deploy
```

Usa o `DIRECT_URL` do seu `.env`.
