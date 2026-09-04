# Deploy no Railway

Topologia escolhida:

- **Projeto Railway próprio** para o ContaHora (separado do projeto da Barretech).
- 3 serviços: **Postgres**, **api**, **web**.
- Acesso por **subdomínio** do domínio da Barretech:
  | Subdomínio | Aponta para | Onde ele aparece |
  |---|---|---|
  | `contahora.barretechsolutions.com.br` | serviço **web** | é o endereço que as pessoas abrem |
  | `api.contahora.barretechsolutions.com.br` | serviço **api** | só no `VITE_API_URL` (ninguém digita) |

  > Alternativa sem o 2º subdomínio: usar o domínio `*.up.railway.app` que o
  > Railway gera para o serviço `api` direto no `VITE_API_URL`. Funciona igual;
  > o subdomínio próprio é só mais estável/bonito.

O site atual da Barretech (`www.barretechsolutions.com.br`) **não é tocado**.

---

## 1. Postgres

No projeto do ContaHora: **New → Database → PostgreSQL**. Cria a var `DATABASE_URL`.

## 2. Serviço `api`

**New → GitHub Repo →** este repositório.

- **Settings → Root Directory:** `api`
- **Settings → Networking → Custom Domain:** `api.contahora.barretechsolutions.com.br`
  (o Railway mostra um alvo CNAME — anote para o passo 4). Ou só gere o domínio
  `*.up.railway.app` e pule o CNAME da API.
- **Variables:**
  | Nome | Valor |
  |---|---|
  | `DATABASE_URL` | referência `${{Postgres.DATABASE_URL}}` |
  | `JWT_SECRET` | chave longa aleatória |
  | `JWT_EXPIRES_IN` | `7d` |
  | `WEB_ORIGIN` | `https://contahora.barretechsolutions.com.br` |
  | `APP_WEB_URL` | `https://contahora.barretechsolutions.com.br` |
  | `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | credenciais do 1º admin (seed) |
  | `ADMIN_EMAILS` | e-mails que viram ADMIN sozinhos no login (vírgula) |
  | `REGISTRATION_OPEN` | `true` ou `false` |
  | `GOOGLE_CLIENT_ID` | ID do cliente OAuth (se usar login com Google) |
  | `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | provedor de e-mail p/ reset de senha. Sem isso, o link de reset só sai nos **logs** |
- `api/railway.json` já roda `prisma migrate deploy` antes de subir.
- CORS: `main.ts` libera exatamente o que estiver em `WEB_ORIGIN` (aceita lista separada por vírgula).

## 3. Serviço `web`

**New → GitHub Repo →** mesmo repositório.

- **Settings → Root Directory:** `web`
- **Settings → Networking → Custom Domain:** `contahora.barretechsolutions.com.br`
  (anote o alvo CNAME).
- **Variables:**
  | Nome | Valor |
  |---|---|
  | `VITE_API_URL` | `https://api.contahora.barretechsolutions.com.br/api` (ou `<url .up.railway.app da api>/api`) |
  | `VITE_GOOGLE_CLIENT_ID` | mesmo valor do `GOOGLE_CLIENT_ID` da api (se usar Google) |
- Build `npm run build`; start `npm run start` → `serve -s dist` (SPA fallback, usa a `PORT` do Railway). Definido em `web/railway.json`.
- **`VITE_*` é lido no build** — mudou a variável, tem que **Redeploy** do `web`.

## 4. DNS (no painel do domínio barretechsolutions.com.br)

Crie os registros **CNAME** com os alvos que o Railway mostrou em cada serviço:

| Host | Tipo | Valor (alvo do Railway) |
|---|---|---|
| `contahora` | CNAME | `<algo>.up.railway.app` (do serviço web) |
| `api.contahora` | CNAME | `<algo>.up.railway.app` (do serviço api) |

Propagação leva de minutos a algumas horas. O Railway emite o certificado HTTPS
sozinho depois que o CNAME resolve.

> Se o provedor de DNS não deixar CNAME em subdomínio de subdomínio
> (`api.contahora`), use `contahora-api` como host, ou fique só com a URL
> `*.up.railway.app` da API no `VITE_API_URL`.

## 5. Login com Google (se for usar)

No Google Cloud Console → Credenciais → o ID do cliente OAuth → **Origens
JavaScript autorizadas**, adicione:

```
https://contahora.barretechsolutions.com.br
```

Detalhes em [`login-google.md`](login-google.md).

## Ordem de configuração

1. Cria o projeto ContaHora no Railway + Postgres.
2. Sobe o serviço `api` (root `api`), define as variáveis, gera o domínio
   (`api.contahora...` ou o `.up.railway.app`).
3. Sobe o serviço `web` (root `web`), define `VITE_API_URL` apontando pra api,
   gera o domínio `contahora.barretechsolutions.com.br`.
4. Cria os CNAMEs no DNS. Espera resolver / HTTPS ativar.
5. Cria o admin: `railway run --service api npm run seed`
   (ou deixe o `ADMIN_EMAILS` + login com Google/registro criar o seu).
6. Abre `https://contahora.barretechsolutions.com.br` e entra.

## Observações

- Migrations novas: basta commitar em `api/prisma/migrations`; o próximo deploy
  roda `prisma migrate deploy`.
- Trocar `VITE_API_URL` ou `VITE_GOOGLE_CLIENT_ID` exige **redeploy do web**.
- As libs de PDF (`jspdf`) carregam sob demanda e ficam em cache do service
  worker — não pesam no primeiro carregamento.
