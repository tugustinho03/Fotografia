# Câmara Escura Digital — configuração do envio de email

Esta app envia a foto editada por email usando a **API do Brevo** (300
emails/dia gratuitos, sem cartão de crédito). A chave da API **não fica no
código do browser** — fica guardada em segredo no servidor (Vercel), numa
"function" que faz a chamada à Brevo por trás. Assim ninguém consegue
copiar a tua chave a partir do código-fonte da página.

```
projeto/
├── index.html
├── style.css
├── script.js          ← chama "/api/send-email" (sem chave nenhuma aqui)
├── vercel.json
└── api/
    └── send-email.js  ← só este ficheiro conhece a API key (no servidor)
```

---

## 1. Configurar a conta Brevo

Como já tens conta, falta só:

1. Entra em [app.brevo.com](https://app.brevo.com).
2. Vai a **Senders & IPs → Senders** (ou "Remetentes") e adiciona/verifica
   o email que vai aparecer como remetente (ex: o teu email pessoal ou um
   email do teu domínio). A Brevo envia um email de confirmação — tens de
   clicar no link.
   - Sem isto, a Brevo rejeita o envio com erro de remetente não verificado.
3. Vai a **SMTP & API → API Keys** e confirma que tens uma chave criada
   (ou cria uma nova com o botão "Generate a new API key").
   - Guarda essa chave num local seguro — vais usá-la no passo 3, mas
     **não a colas em nenhum ficheiro do projeto**.

> 💡 Opcional, mas recomendado se publicares com domínio próprio: verificar
> o domínio inteiro (SPF/DKIM) em **Senders & IPs → Domains**, para os
> emails não caírem em spam.

---

## 2. Publicar na Vercel (gratuito)

1. Cria conta em [vercel.com](https://vercel.com) (podes entrar com GitHub).
2. Sobe esta pasta para um repositório no GitHub (ou usa o CLI da Vercel —
   `npm i -g vercel` e depois `vercel` dentro da pasta do projeto).
3. Na Vercel, clica em **Add New → Project** e importa o repositório.
   - Não precisas de configurar build command nem output directory;
     a Vercel deteta os ficheiros estáticos e a pasta `api/` automaticamente.

## 3. Configurar as variáveis de ambiente (onde fica a tua chave secreta)

Ainda no painel do projeto na Vercel:

1. Vai a **Settings → Environment Variables**.
2. Adiciona estas três:

   | Nome | Valor |
   |---|---|
   | `BREVO_API_KEY` | a tua chave da API do Brevo |
   | `BREVO_SENDER_EMAIL` | o email que verificaste no passo 1 |
   | `BREVO_SENDER_NAME` | ex: `Câmara Escura Digital` (opcional) |

3. Clica em **Save**.
4. Vai a **Deployments** e faz **Redeploy** (as variáveis só entram em vigor
   num novo deploy).

Pronto — o site fica no ar com a chave totalmente escondida do lado do
cliente.

---

## Testar localmente (opcional)

Se quiseres testar no teu PC antes de publicar:

```bash
npm i -g vercel
vercel dev
```

Cria um ficheiro `.env.local` na raiz do projeto (este ficheiro **não deve
ser enviado para o GitHub** — adiciona-o ao `.gitignore`):

```
BREVO_API_KEY=a_tua_chave_aqui
BREVO_SENDER_EMAIL=o_teu_email_verificado@exemplo.com
BREVO_SENDER_NAME=Câmara Escura Digital
```

O `vercel dev` lê este ficheiro automaticamente e simula a function
localmente em `http://localhost:3000`.

---

## Limites do plano gratuito da Brevo

- 300 emails por dia (reinicia à meia-noite, fuso horário da tua conta).
- Sem necessidade de cartão de crédito.
- Se precisares de mais volume, há planos pagos, mas para uma app pessoal
  ou de pequena escala o gratuito costuma ser suficiente.

## Erros comuns

- **"Sender not verified"** → falta confirmar o email no passo 1.2.
- **"Configuração em falta no servidor"** → faltam variáveis de ambiente
  na Vercel, ou esqueceste de fazer redeploy depois de as adicionares.
- Email cai em spam → considera verificar o domínio completo (SPF/DKIM) em
  Senders & IPs → Domains.
