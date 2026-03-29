# Job Vacancies — AI-Powered Job Finder

A [Next.js](https://nextjs.org) application that analyzes the candidate's resume with AI and automatically searches for compatible job vacancies, displaying an interactive dashboard with detailed compatibility analysis.

---

## How it works

1. **Resume upload** — The candidate uploads their resume (PDF, DOCX, or TXT).
2. **OpenAI indexing** — The resume is uploaded to the OpenAI Files API and indexed in a Vector Store, enabling semantic search (RAG) over the document.
3. **Profile extraction** — The OpenAI Responses API (`gpt-4.1-mini` + `file_search`) reads the resume and extracts the candidate's full profile: skills, experience, seniority, stack, and more.
4. **Job search** — [Manus AI](https://manus.im) autonomously browses the web to find compatible vacancies, returning a structured JSON with title, company, location, salary, tags, compatibility analysis, and approval probability.
5. **Vacancies indexed** — The found vacancies JSON is uploaded to the same Vector Store as the resume, so the chat can answer questions about specific vacancies with full context.
6. **Interactive dashboard** — Vacancies are displayed as cards with filters by compatibility, work mode (remote/on-site), and area, plus a modal with full vacancy details and candidate analysis.
7. **Chat with AI** — The candidate can chat with the AI about their resume, the found vacancies, interview tips, and more — the model has access to both the resume and the vacancies via `file_search`.

---

## Required APIs

### 1. [OpenAI](https://platform.openai.com) — Resume Analysis, RAG & Chat

Used for everything related to AI: resume upload to Files API, Vector Store indexing, profile extraction, vacancy query generation, and streaming chat.

| Environment variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (`sk-proj-...`) |

Model used:
- **`gpt-4.1-mini`** — all AI tasks: resume analysis, query generation, chat (via Responses API + `file_search`), and candidate profile extraction

> Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys) to generate your key.

---

### 2. [Manus AI](https://manus.im) — Autonomous Job Search

An AI agent that autonomously browses the web to find vacancies compatible with the candidate's profile, returning a structured JSON with each vacancy's data.

| Environment variable | Description |
|---|---|
| `MANUS_API_KEY` | Manus AI API key |

> Visit [manus.im](https://manus.im) to create your account and get your API key.

---

## Setup

1. Clone the repository:

```bash
git clone https://github.com/your-username/job-vacancies.git
cd job-vacancies
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file at the project root:

```env
# OpenAI (resume indexing, RAG, chat)
OPENAI_API_KEY=sk-proj-...

# Manus AI (autonomous job search)
MANUS_API_KEY=your_manus_key
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architecture

```
User uploads resume
        │
        ▼
POST /api/upload
  └── OpenAI Files API  →  file uploaded
  └── OpenAI Vector Store  →  resume indexed
        │
        ▼
POST /api/chat/send  (profile extraction)
  └── gpt-4.1-mini + file_search  →  full resume analysis text
        │
        ▼
POST /api/chat/send  (query generation)
  └── gpt-4.1-mini + file_search  →  search query string
        │
        ▼
POST /api/manus  (job search)
  └── Manus AI  →  vacancies JSON
        │
        ▼
PATCH /api/upload  (index vacancies)
  └── OpenAI Files API  →  vagas_encontradas.json uploaded
  └── same Vector Store  →  vacancies indexed alongside resume
        │
        ▼
POST /api/chat/stream  (chat)
  └── gpt-4.1-mini + file_search  →  streams response
      (has access to both resume and vacancies)
```

---

## Tech Stack

- [Next.js](https://nextjs.org) — React framework with App Router
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [OpenAI Node SDK](https://github.com/openai/openai-node) — Files API, Vector Stores, Responses API (RAG + streaming chat)
- [Manus AI](https://manus.im) — Autonomous job search agent
- [uuid](https://github.com/uuidjs/uuid) — Local session management
