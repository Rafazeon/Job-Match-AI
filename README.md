# 🎯 Job Vacancies — AI-Powered Job Finder

A [Next.js](https://nextjs.org) application that analyzes the candidate's resume with AI and automatically searches for compatible job vacancies, displaying an interactive dashboard with detailed compatibility analysis.

---

## 🚀 How it works

1. **Resume upload** — The candidate uploads their resume (PDF, DOCX, or TXT).
2. **RAG Analysis** — The resume is sent to [eBotMaker](https://www.ebotmaker.ai), which creates a bot with RAG (Retrieval-Augmented Generation) to extract the candidate's skills, experience, and profile.
3. **Profile extraction** — The OpenAI API (GPT-4o-mini) extracts the candidate's name and seniority level from the analysis.
4. **Job search** — [Manus AI](https://manus.im) autonomously browses the web to find compatible vacancies, returning a structured JSON with title, company, location, salary, tags, compatibility analysis, and approval probability.
5. **Interactive dashboard** — Vacancies are displayed as cards with filters by compatibility, work mode (remote/on-site), and area, plus a modal with full vacancy details and candidate analysis.

---

## 🔑 Required APIs

### 1. [eBotMaker](https://www.ebotmaker.ai) — RAG & Resume Analysis

AI platform with RAG support used to create per-candidate bots, upload resumes, and perform profile analysis via chat.

| Environment variable | Description |
|---|---|
| `NEXT_PUBLIC_API_IA_URL` | eBotMaker API base URL (e.g. `https://api.ebotmaker.ai`) |
| `NEXT_PUBLIC_API_IA_TOKEN` | Authentication token (`x-api-key`) from your eBotMaker account |
| `BOT_EBOTMAKER_WEBHOOK_ID` | Webhook ID configured in the eBotMaker dashboard for bot creation |

> Visit [www.ebotmaker.ai](https://www.ebotmaker.ai) to create your account and get your credentials.

---

### 2. [OpenAI](https://platform.openai.com) — Candidate Profile Extraction

Used to extract the candidate's name and seniority level from the resume analysis. The model used is **GPT-4o-mini**.

| Environment variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (`sk-proj-...`) |

> Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys) to generate your key.

---

### 3. [Manus AI](https://manus.im) — Autonomous Job Search

An AI agent that autonomously browses the web to find vacancies compatible with the candidate's profile, returning a structured JSON with each vacancy's data.

| Environment variable | Description |
|---|---|
| `MANUS_API_KEY` | Manus AI API key |

> Visit [manus.im](https://manus.im) to create your account and get your API key.

---

## ⚙️ Setup

1. Clone the repository:

```bash
git clone https://github.com/your-username/job-vacancies.git
cd job-vacancies
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file at the project root with the following variables:

```env
# eBotMaker (RAG + resume analysis)
NEXT_PUBLIC_API_IA_URL=https://api.ebotmaker.ai
NEXT_PUBLIC_API_IA_TOKEN=your_ebotmaker_token
BOT_EBOTMAKER_WEBHOOK_ID=your_webhook_id

# OpenAI (profile extraction)
OPENAI_API_KEY=sk-proj-...

# Manus AI (job search)
MANUS_API_KEY=your_manus_key
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

- [Next.js 14](https://nextjs.org) — React framework with App Router
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Axios](https://axios-http.com) — HTTP requests
- [eBotMaker](https://www.ebotmaker.ai) — RAG & resume analysis
- [OpenAI GPT-4o-mini](https://platform.openai.com) — Profile extraction
- [Manus AI](https://manus.im) — Autonomous job search agent
