# ContaHora

Dashboard/grid para anotação de **Horas Extras por mês**. PWA instalável.

- **Front:** Vue 3 + Vite + TypeScript + Vuetify + Pinia (`web/`)
- **API:** NestJS + Prisma + JWT (`api/`)
- **Banco:** PostgreSQL
- **Deploy:** Railway (3 serviços: Postgres, `api`, `web`)

## Rodando localmente

Pré-requisitos: Node 20+, Docker (para o Postgres).

```bash
# 1. sobe o Postgres local
docker compose up -d

# 2. API
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed          # cria o admin inicial
npm run start:dev     # http://localhost:3000

# 3. Front (outro terminal)
cd web
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

Login inicial: `admin@contahora.local` / `admin123` (definido em `api/.env`).

## Estrutura

```
api/   NestJS + Prisma
  src/auth/      login, JWT, guards de role
  src/users/     CRUD de usuários (só ADMIN)
  src/entries/   CRUD de lançamentos + summary mensal
web/   Vue + Vuetify
  src/pages/     Login, Dashboard, Entries, Users
  src/stores/    auth
```

## Deploy no Railway

Ver [`docs/deploy-railway.md`](docs/deploy-railway.md).
