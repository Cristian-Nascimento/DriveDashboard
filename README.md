# Pop Dashboard

Controle financeiro para motorista de aplicativo com vendinha no carro. Lançamento **100% manual**, feito para ser preenchido uma vez, no fim do dia.

## Rodar localmente

Precisa de Node 20+ e de um PostgreSQL. O jeito mais fácil é o Docker:

```bash
docker compose up -d     # sobe o Postgres local (usuário/senha: pop)
cp .env.example .env     # no Windows: copy .env.example .env
npm install
npm run db:migrate       # cria as tabelas
npm run dev              # http://localhost:3000
```

Na primeira vez, abra `/cadastro` e crie a conta. Depois coloque `ALLOW_REGISTER="false"` para fechar novos cadastros.

## Fluxo de uso

1. **Contas**: cadastre as despesas mensais (veja abaixo). Uma vez só.
2. **Lançar** (todo fim de dia, ou de qualquer data passada): fechamento (km e horas), o que entrou, vendas da vendinha e despesas, com um único botão Salvar. Campos em branco são ignorados. Todo lançamento pode ser editado ou excluído.
3. **Painel**: lucro e indicadores de hoje, da semana e do mês, mais aviso de contas vencidas ou a vencer.
4. **Relatórios**: semanal e mensal, com CSV para o Excel.
5. **Ajustes**: tema claro ou escuro e troca de senha.

## Contas mensais (parceladas e fixas)

Em **Contas** você informa: nome, tipo de despesa, valor, vencimento, a parcela atual e quantas faltam. O sistema cadastra **todas as parcelas, a atual e as futuras** (ex.: parcela 3, faltam 9 → parcelas 3/12 a 12/12, cada uma no seu mês).

- **Fixa mensal (sem fim)**: aluguel, internet, plano… Mantém sempre os próximos 12 meses cadastrados e se renova sozinha.
- **Marcar como paga**: informa data e valor pago; isso lança a despesa automaticamente nos relatórios na data do pagamento. “Desfazer” remove o lançamento.
- Dá para editar valor e vencimento de uma parcela, ou o valor das parcelas ainda não pagas de uma conta.

## Como os números são calculados

- Não há maquininha, taxa nem forma de recebimento: vale o valor que entrou.
- Lucro das corridas = valor das corridas − despesas do carro (inclui contas pagas do tipo “carro”).
- Lucro da vendinha = vendas − custo das mercadorias − despesas da vendinha.
- Ganho/km, lucro/km, custo/km e por hora usam o km e as horas do fechamento do dia.

## Senha

- **Esqueci minha senha**: envia um link (vale 1 hora) por e-mail. Configure o SMTP no `.env` (veja `.env.example`). Sem SMTP, em desenvolvimento o link aparece na própria tela e no log.
- **Alterar senha**: em Ajustes.

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind v4 · Prisma · **PostgreSQL (Cloud SQL no GCP)** · Recharts · login próprio (bcrypt + cookie JWT httpOnly) · Nodemailer.

## Publicar

- **MVP (recomendado):** [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md): Vercel + Supabase (Postgres), tudo no plano gratuito.
- **Alternativa:** [DEPLOY-GCP.md](DEPLOY-GCP.md): Cloud Run + Cloud SQL, com Dockerfile pronto.

## Fora do escopo

Integração automática com maquininhas, taxas por forma de pagamento e cobrança de assinatura.
