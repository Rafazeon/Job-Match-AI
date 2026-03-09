# 🎯 Job Vacancies — Buscador Inteligente de Vagas

Aplicação [Next.js](https://nextjs.org) que analisa o currículo do candidato com IA e busca automaticamente vagas de emprego compatíveis com o seu perfil, exibindo um dashboard interativo com análise detalhada de compatibilidade.

---

## 🚀 Como funciona

1. **Upload do currículo** — O candidato faz o upload do seu currículo (PDF ou texto).
2. **Análise com RAG** — O currículo é enviado para o [eBotMaker](https://www.ebotmaker.ai), que cria um bot com RAG (Retrieval-Augmented Generation) para extrair habilidades, experiências e perfil do candidato.
3. **Extração de perfil** — A API da OpenAI (GPT-4o-mini) extrai nome e senioridade do candidato a partir da análise.
4. **Busca de vagas** — O [Manus AI](https://manus.im) navega na web e busca vagas compatíveis com o perfil, retornando um JSON estruturado com título, empresa, localização, salário, tags, análise de compatibilidade e probabilidade de aprovação.
5. **Dashboard interativo** — As vagas são exibidas em cards com filtros por compatibilidade, modalidade (remoto/presencial) e área, além de modal com detalhes completos da vaga e análise do candidato.

---

## 🔑 APIs necessárias

### 1. [eBotMaker](https://www.ebotmaker.ai) — RAG e análise de currículo

Plataforma de IA com suporte a RAG utilizada para criar bots por candidato, fazer upload do currículo e realizar a análise de perfil via chat.

| Variável de ambiente | Descrição |
|---|---|
| `NEXT_PUBLIC_API_IA_URL` | URL base da API do eBotMaker (ex: `https://api.ebotmaker.ai`) |
| `NEXT_PUBLIC_API_IA_TOKEN` | Token de autenticação (`x-api-key`) da sua conta eBotMaker |
| `BOT_EBOTMAKER_WEBHOOK_ID` | ID do webhook configurado no painel do eBotMaker para criação de bots |

> Acesse [www.ebotmaker.ai](https://www.ebotmaker.ai) para criar sua conta e obter as credenciais.

---

### 2. [OpenAI](https://platform.openai.com) — Extração de perfil do candidato

Utilizado para extrair nome e nível de senioridade do candidato a partir da análise do currículo. O modelo utilizado é o **GPT-4o-mini**.

| Variável de ambiente | Descrição |
|---|---|
| `OPENAI_API_KEY` | Chave de API da OpenAI (`sk-proj-...`) |

> Acesse [platform.openai.com/api-keys](https://platform.openai.com/api-keys) para gerar sua chave.

---

### 3. [Manus AI](https://manus.im) — Busca autônoma de vagas

Agente de IA que navega na web de forma autônoma para encontrar vagas compatíveis com o perfil do candidato e retorna um JSON estruturado com os dados de cada vaga.

| Variável de ambiente | Descrição |
|---|---|
| `MANUS_API_KEY` | Chave de API do Manus AI |

> Acesse [manus.im](https://manus.im) para criar sua conta e obter a chave de API.

---

## ⚙️ Configuração

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/job-vacancies.git
cd job-vacancies
```

2. Instale as dependências:

```bash
npm install
```

3. Crie o arquivo `.env.local` na raiz do projeto com as variáveis:

```env
# eBotMaker (RAG + análise de currículo)
NEXT_PUBLIC_API_IA_URL=https://api.ebotmaker.ai
NEXT_PUBLIC_API_IA_TOKEN=seu_token_ebotmaker
BOT_EBOTMAKER_WEBHOOK_ID=seu_webhook_id

# OpenAI (extração de perfil)
OPENAI_API_KEY=sk-proj-...

# Manus AI (busca de vagas)
MANUS_API_KEY=sua_chave_manus
```

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

5. Acesse [http://localhost:3000](http://localhost:3000) no navegador.

---

## 🛠️ Tecnologias

- [Next.js 14](https://nextjs.org) — Framework React com App Router
- [Tailwind CSS](https://tailwindcss.com) — Estilização
- [Axios](https://axios-http.com) — Requisições HTTP
- [eBotMaker](https://www.ebotmaker.ai) — RAG e análise de currículo
- [OpenAI GPT-4o-mini](https://platform.openai.com) — Extração de perfil
- [Manus AI](https://manus.im) — Agente autônomo de busca de vagas
