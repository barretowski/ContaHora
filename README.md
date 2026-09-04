# ContaHora

Dashboard/grid para anotação de **Horas Extras por mês**. PWA instalável.

- **Front:** Vue 3 + Vite + TypeScript + Vuetify + Pinia (`web/`)
- **API:** NestJS + Prisma + JWT (`api/`)
- **Banco:** PostgreSQL
- **Auth:** e-mail/senha + auto-registro + reset de senha + **login com Google** (opcional, ver [`docs/login-google.md`](docs/login-google.md))
- **Deploy:** Railway (projeto próprio; 3 serviços: Postgres, `api`, `web`), acesso por `contahora.barretechsolutions.com.br` — ver [`docs/deploy-railway.md`](docs/deploy-railway.md)

## Rodando localmente

Guia completo em [`docs/rodar-local.md`](docs/rodar-local.md). Resumo:

```bash
# 1. Postgres (Docker Desktop precisa estar aberto)
docker compose up -d

# 2. API (terminal 2)
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed          # cria o admin inicial
npm run start:dev     # http://localhost:3000

# 3. Front (terminal 3)
cd web
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

Login inicial: `admin@contahora.local` / `admin123` (definido em `api/.env`).
O Postgres do container roda na porta **5433** (a 5432 costuma já estar ocupada).

## Estrutura

```
api/   NestJS + Prisma
  src/auth/      login, registro, Google, reset e troca de senha, perfil, JWT, roles
                 rate limiting (@nestjs/throttler) + ADMIN_EMAILS allowlist
  src/mail/      envio de e-mail (SMTP opcional, fallback no console)
  src/users/     CRUD de usuários (só ADMIN)
  src/entries/   CRUD de lançamentos + summary anual + overview mensal da equipe
web/   Vue + Vuetify
  src/pages/     Login, Register, ForgotPassword, ResetPassword,
                 Dashboard, Entries, Report, Profile, Admin, Users
  src/components/ AuthShell, GoogleSignInButton
  src/lib/       report (txt/mensagem), pdf (jspdf), image (resize de avatar)
  src/stores/    auth
```

### Relatório

Aba **Relatório**: extrai as horas do mês em **PDF**, **.txt** ou **mensagem**
(copiar / compartilhar). Admin escolhe o funcionário.

### Perfil e Admin

- **Meu perfil** (menu do avatar): trocar nome, foto (upload com redimensionamento)
  e senha — inclusive *definir* senha para contas que entraram só com Google.
- **Admin** (só ADMIN): consolidado da equipe no mês + atalho para Funcionários.
  E-mails em `ADMIN_EMAILS` viram ADMIN automaticamente no login.

## Login com Google

Opcional. Configuração do ID do cliente OAuth em [`docs/login-google.md`](docs/login-google.md).

## Deploy no Railway

Ver [`docs/deploy-railway.md`](docs/deploy-railway.md).
