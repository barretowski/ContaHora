# Login com Google (Gmail)

O ContaHora aceita **"Entrar com o Google"** nas telas de login e de cadastro.
Fluxo usado: **Google Identity Services** — o botão do Google devolve um *ID token*,
a API valida esse token (`google-auth-library`) e emite o JWT normal do sistema.

- Não usa client secret.
- Primeiro login com um e-mail que **já existe** no sistema → vincula o Google
  àquela conta. E-mail novo → cria um funcionário (role `USER`), respeitando
  `REGISTRATION_OPEN`.
- Conta criada só pelo Google não tem senha; para usar e-mail/senha depois, é só
  pedir "Esqueci minha senha".

Sem `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` configurados, o botão simplesmente
não aparece e `POST /auth/google` responde `503`.

---

## 1. Criar o ID do cliente OAuth no Google Cloud

1. Acesse <https://console.cloud.google.com/> e crie (ou selecione) um projeto.
2. **APIs e serviços → Tela de permissão OAuth**
   - Tipo de usuário: **Externo** → Criar
   - Preencha nome do app, e-mail de suporte e e-mail do desenvolvedor
   - Em *Público*, adicione seu e-mail em **Usuários de teste** (enquanto o app
     estiver em modo "Teste"); ou publique o app
3. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**
   - Tipo de aplicativo: **Aplicativo da Web**
   - **Origens JavaScript autorizadas** (sem barra no final):
     | Ambiente | Valor |
     |---|---|
     | Local | `http://localhost:5173` |
     | Produção | `https://SEU-web.up.railway.app` |
   - **URIs de redirecionamento autorizados**: *não precisa* (o fluxo é via ID token).
   - Criar → copie o **ID do cliente** (algo como
     `123456789-abc123.apps.googleusercontent.com`).

---

## 2. Configurar o projeto

O **mesmo** ID do cliente vai nos dois lados:

**`api/.env`**
```
GOOGLE_CLIENT_ID="123456789-abc123.apps.googleusercontent.com"
```

**`web/.env`**
```
VITE_GOOGLE_CLIENT_ID="123456789-abc123.apps.googleusercontent.com"
```

Reinicie a API e o front (`npm run dev`). O botão do Google aparece nas telas
`/login` e `/registrar`.

### Railway

- Serviço **api**: variável `GOOGLE_CLIENT_ID`
- Serviço **web**: variável `VITE_GOOGLE_CLIENT_ID` (é lida no build — after mudar,
  faça **redeploy** do `web`)
- Adicione a URL pública do `web` nas **Origens JavaScript autorizadas** do Google

---

## 3. Testar

1. Abra `/login`
2. Clique em **"Continuar com o Google"**
3. Escolha a conta Google → volta logado no dashboard
4. O avatar do Google aparece no canto superior direito

---

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| Botão não aparece | `VITE_GOOGLE_CLIENT_ID` vazio no `web/.env`, ou o front não foi reiniciado/rebuildado |
| `503` em `/auth/google` | `GOOGLE_CLIENT_ID` não setado na API |
| `401 Token do Google inválido` | ID do cliente diferente entre front e API, ou token expirado |
| Popup do Google fecha com erro / `origin_mismatch` | a origem (ex: `http://localhost:5173`) não está nas **Origens JavaScript autorizadas** |
| `403 Cadastro aberto está desativado` | `REGISTRATION_OPEN=false` e o e-mail do Google ainda não tem conta — um admin precisa criar o usuário primeiro |
| `Acesso bloqueado: app não verificado` | adicione seu e-mail em *Usuários de teste* na tela de permissão OAuth, ou publique o app |
