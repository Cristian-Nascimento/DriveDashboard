# Publicar no Google Cloud (Cloud Run + Cloud SQL)

Arquitetura: o app roda no **Cloud Run** (container) e o banco é um **Cloud SQL for PostgreSQL**. As migrações são aplicadas automaticamente quando o container sobe.

> Custo: o Cloud SQL **não** tem camada gratuita permanente (cobra pela instância ligada). A menor instância (`db-f1-micro`) costuma ser a opção mais barata; confira o valor atual na calculadora de preços do Google Cloud antes de criar. O Cloud Run cobra por uso e tem franquia gratuita mensal.

## 1. Preparar o projeto no GCP

```bash
gcloud auth login
gcloud projects create pop-dashboard-SEU-ID   # ou use um projeto existente
gcloud config set project pop-dashboard-SEU-ID
# ative o faturamento do projeto no console (obrigatório para Cloud SQL)

gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  secretmanager.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## 2. Criar o banco

```bash
gcloud sql instances create pop-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=southamerica-east1 \
  --storage-auto-increase \
  --backup-start-time=05:00

gcloud sql databases create popdashboard --instance=pop-db
gcloud sql users create pop --instance=pop-db --password='UMA_SENHA_FORTE_SEM_CARACTERES_ESPECIAIS'
```

O nome de conexão da instância é `PROJETO:southamerica-east1:pop-db` (veja com `gcloud sql instances describe pop-db --format='value(connectionName)'`).

## 3. Guardar os segredos

```bash
# URL de conexão via socket do Cloud SQL (troque PROJETO e a senha)
printf 'postgresql://pop:UMA_SENHA_FORTE_SEM_CARACTERES_ESPECIAIS@localhost/popdashboard?schema=public&host=/cloudsql/PROJETO:southamerica-east1:pop-db' \
  | gcloud secrets create DATABASE_URL --data-file=-

# chave de sessão (string aleatória longa)
openssl rand -hex 32 | gcloud secrets create SESSION_SECRET --data-file=-
```

Dê permissão à conta de serviço do Cloud Run para ler os segredos e usar o Cloud SQL:

```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:$SA" --role=roles/cloudsql.client
```

## 4. Publicar

Na pasta do projeto:

```bash
gcloud run deploy pop-dashboard \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJETO:southamerica-east1:pop-db \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,SESSION_SECRET=SESSION_SECRET:latest \
  --set-env-vars ALLOW_REGISTER=true,TZ=America/Sao_Paulo \
  --memory 512Mi --max-instances 2
```

O comando devolve a URL pública (`https://pop-dashboard-xxxx.a.run.app`). Abra no celular, crie a conta do seu irmão em `/cadastro` e, em seguida, feche o cadastro:

```bash
gcloud run services update pop-dashboard --region southamerica-east1 --update-env-vars ALLOW_REGISTER=false
```

Anote também a URL para os links de e-mail:

```bash
gcloud run services update pop-dashboard --region southamerica-east1 --update-env-vars APP_URL=https://SUA-URL.a.run.app
```

## 5. E-mail de recuperação de senha (SMTP)

Sem SMTP o link de redefinição só aparece no log (modo desenvolvimento). Em produção configure um servidor SMTP (por exemplo Gmail com “senha de app”, Brevo, SendGrid ou Mailgun):

```bash
printf 'SENHA_DO_SMTP' | gcloud secrets create SMTP_PASS --data-file=-
gcloud run services update pop-dashboard --region southamerica-east1 \
  --update-env-vars SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_USER=seu@gmail.com,MAIL_FROM="Pop Dashboard <seu@gmail.com>" \
  --update-secrets SMTP_PASS=SMTP_PASS:latest
```

## 6. Atualizações futuras

Basta repetir o `gcloud run deploy ... --source .` (passo 4). Mudanças no banco entram como novas migrações em `prisma/migrations` e são aplicadas no start.

## 7. Backup e segurança

- Backups automáticos diários já ficam ativos pelo `--backup-start-time`.
- Para ver os dados manualmente use o **Cloud SQL Studio** no console ou o `cloud-sql-proxy`.
- Nunca coloque senhas no repositório; o `.env` está no `.gitignore`.
