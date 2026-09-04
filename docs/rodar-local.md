# Rodar o ContaHora localmente

Guia completo de setup para desenvolvimento.

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 20+ | `node -v` |
| npm | 10+ | vem com o Node |
| Docker Desktop | qualquer recente | só para o Postgres; opcional se você já tem um Postgres |

> **Windows:** o Docker Desktop precisa estar **aberto e com "Engine running"** antes de qualquer `docker compose`.

---

## Visão geral

```
ContaHora/
├── docker-compose.yml   → Postgres em localhost:5433
├── api/                 → NestJS + Prisma   (porta 3000)
└── web/                 → Vue + Vuetify     (porta 5173)
```

São **3 processos**: banco (Docker), API e front. Cada um num terminal.

---

## 1. Banco de dados (Postgres)

O container publica na porta **5433** do host (a 5432 costuma estar ocupada por um
Postgres instalado na máquina).

```bash
# na raiz do repo
docker compose up -d

# conferir que subiu
docker compose ps
# STATUS deve ser "Up"; PORTS deve mostrar 0.0.0.0:5433->5432/tcp
```

Credenciais (definidas no `docker-compose.yml`): usuário `contahora`, senha
`contahora`, banco `contahora`.

Para parar / zerar:

```bash
docker compose stop         # pausa (mantém os dados)
docker compose down          # remove o container (mantém os dados no volume)
docker compose down -v       # remove TUDO, inclusive os dados
```

### Alternativa sem Docker

Se você já tem um PostgreSQL local, crie o banco e o usuário e ajuste a
`DATABASE_URL` no passo 2 (troque a porta para `5432`):

```sql
CREATE ROLE contahora WITH LOGIN PASSWORD 'contahora';
CREATE DATABASE contahora OWNER contahora;
```

---

## 2. API (`api/`)

```bash
cd api

# primeira vez
cp .env.example .env
npm install

# aplicar as migrations no banco
npx prisma migrate dev

# criar o usuário admin inicial (uma vez)
npm run seed
#  -> Admin criado: admin@contahora.local / admin123

# subir a API em modo watch
npm run start:dev
```

API em **http://localhost:3000/api**. Deixe esse terminal aberto.

### Variáveis (`api/.env`)

| Variável | Padrão local | Para quê |
|---|---|---|
| `DATABASE_URL` | `postgresql://contahora:contahora@localhost:5433/contahora?schema=public` | conexão com o Postgres |
| `JWT_SECRET` | `troque-esta-chave-em-producao` | assinatura do token |
| `JWT_EXPIRES_IN` | `7d` | validade do token |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `admin@contahora.local` / `admin123` / `Administrador` | usado pelo `npm run seed` |
| `WEB_ORIGIN` | `http://localhost:5173` | libera o CORS para o front |
| `REGISTRATION_OPEN` | `true` | `false` desativa o "Criar uma conta" da tela de login |
| `ADMIN_EMAILS` | vazio | e-mails que viram ADMIN automaticamente no login (separe por vírgula), inclusive via Google |
| `GOOGLE_CLIENT_ID` | vazio | ID do cliente OAuth p/ "Entrar com o Google". Ver [login-google.md](login-google.md). Vazio = botão escondido |
| `APP_WEB_URL` | `http://localhost:5173` | base dos links nos e-mails (default: 1º `WEB_ORIGIN`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | vazio | envio de e-mail. **Sem `SMTP_HOST`, o link de reset de senha é impresso no console da API** |
| `PORT` | `3000` | porta da API |

### Contas e senha

- **Criar uma conta:** link na tela de login → cria um funcionário (role USER).
- **Esqueci minha senha:** link na tela de login → informe o e-mail. Em dev (sem
  SMTP), o link de redefinição aparece no **console onde a API está rodando**:
  ```
  ----- RESET DE SENHA (dev) -----
  para: fulano@teste.com
  link: http://localhost:5173/redefinir-senha?token=...
  ```
  Abra esse link no navegador para definir a nova senha.
- **Entrar com o Google:** opcional. Preencha `GOOGLE_CLIENT_ID` (api) e
  `VITE_GOOGLE_CLIENT_ID` (web) com o mesmo ID do cliente OAuth. Passo a passo em
  [login-google.md](login-google.md).

### Comandos úteis

```bash
npm run start:dev        # dev com hot-reload
npm run build            # compila para dist/
npm run start:prod       # roda dist/main.js (igual produção)
npm run seed             # recria o admin se não existir
npx prisma studio        # UI web para ver/editar o banco
npx prisma migrate dev --name <nome>   # cria uma migration nova após mexer no schema.prisma
```

---

## 3. Front (`web/`)

Em **outro terminal**:

```bash
cd web

# primeira vez
cp .env.example .env
npm install

npm run dev
```

Front em **http://localhost:5173**. `web/.env`:

```
VITE_API_URL="http://localhost:3000/api"
VITE_GOOGLE_CLIENT_ID=""   # opcional; mesmo valor do GOOGLE_CLIENT_ID da API
```

> `VITE_*` é lido no **build/start** do Vite — mudou, reinicie o `npm run dev`.

### Comandos úteis

```bash
npm run dev         # servidor de desenvolvimento (Vite)
npm run build       # gera web/dist/ (checagem de tipos + build + PWA)
npm run preview     # serve o build de produção localmente
```

---

## 4. Primeiro acesso

1. Abra http://localhost:5173
2. Login: **admin@contahora.local** / **admin123**
3. Menu **Funcionários** → cadastre as pessoas da equipe (elas entram com o e-mail
   e a senha que você definir)
4. Menu **Lançamentos** → adicione horas extras; **Dashboard** mostra os totais do ano

> Duração aceita vários formatos: `2:30`, `2h30`, `2h`, `2,5` (horas decimais) ou
> `150` (minutos puros).

---

## Checklist rápido (já configurado)

```bash
# terminal 1
docker compose up -d

# terminal 2
cd api && npm run start:dev

# terminal 3
cd web && npm run dev
```

---

## Problemas comuns

### `error during connect: ... dockerDesktopLinuxEngine: O sistema não pode encontrar o arquivo`
Docker Desktop não está rodando. Abra o Docker Desktop e espere "Engine running".
Se ele não iniciar, rode `wsl --update` num PowerShell como administrador e reinicie.

### `P1000: Authentication failed against database server at localhost`
O Prisma conectou no Postgres **errado** — provavelmente um Postgres nativo na
porta 5432. Confirme que a `DATABASE_URL` aponta para a **5433** (container) e que
o container está de pé (`docker compose ps`). Para ver quem ocupa a 5432:

```powershell
Get-Service *postgres*        # serviço nativo do Windows
```

### `Cannot find module '.../dist/main.js'`
Rode `npm run build` dentro de `api/` antes do `npm run start:prod`. O
`start:dev` não precisa de build.

### Porta 3000 ou 5173 já em uso
Feche o processo antigo ou mude a porta (`PORT` no `api/.env`; `server.port` no
`web/vite.config.ts`).

### `docker compose up` falha com conflito de porta
Algum serviço já usa a 5433. Edite o `docker-compose.yml` (`"5434:5432"`) e
ajuste a porta na `DATABASE_URL`.

### Front carrega mas login dá erro de rede / CORS
- A API está rodando? (`http://localhost:3000/api/auth/me` deve responder algo)
- `VITE_API_URL` no `web/.env` bate com a porta da API?
- `WEB_ORIGIN` no `api/.env` inclui `http://localhost:5173`? (reinicie a API após alterar)

### Resetar o banco do zero

```bash
cd api
npx prisma migrate reset      # apaga tudo, reaplica migrations
npm run seed                   # recria o admin
```
