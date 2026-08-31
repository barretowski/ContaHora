# Deploy no Railway

Projeto com **3 serviços** no mesmo projeto Railway.

## 1. Postgres

New → Database → **PostgreSQL**. Railway cria a variável `DATABASE_URL`.

## 2. Serviço `api`

New → GitHub Repo → selecione este repo.

- **Root Directory:** `api`
- **Variables:**
  | Nome | Valor |
  |---|---|
  | `DATABASE_URL` | referência: `${{Postgres.DATABASE_URL}}` |
  | `JWT_SECRET` | uma chave longa aleatória |
  | `JWT_EXPIRES_IN` | `7d` |
  | `WEB_ORIGIN` | URL pública do serviço `web` (ex: `https://contahora-web.up.railway.app`) |
  | `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | credenciais do 1º admin |
- O `startCommand` (em `api/railway.json`) já roda `prisma migrate deploy` antes de subir.
- **Criar o admin** (uma vez): aba do serviço → *Settings* → *Deploy* → ou rode via Railway CLI:
  ```bash
  railway run --service api npm run seed
  ```
- Gere um **domínio público** em Settings → Networking.

## 3. Serviço `web`

New → GitHub Repo → mesmo repo.

- **Root Directory:** `web`
- **Variables:**
  | Nome | Valor |
  |---|---|
  | `VITE_API_URL` | `<URL pública da api>/api` |
- Build: `npm run build` · Start: `npm run preview` (usa a `PORT` do Railway).
- Gere o domínio público e coloque-o em `WEB_ORIGIN` na `api`.

## Ordem de configuração

1. Postgres
2. `web` (só pra ter a URL) → copie a URL
3. `api` com `WEB_ORIGIN` = URL do web → copie a URL da api
4. Volte no `web`, ajuste `VITE_API_URL` → redeploy
5. `railway run --service api npm run seed`
6. Login com `ADMIN_EMAIL` / `ADMIN_PASSWORD`

## Observações

- `vite preview` serve o SPA e é suficiente para uso interno. Para algo mais
  robusto troque por `serve -s dist` (add `serve` nas deps do `web`).
- Migrations novas: commit em `api/prisma/migrations` e o próximo deploy aplica.
