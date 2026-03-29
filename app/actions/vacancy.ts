import { searchVacanciesWithManus, ManusVacancy } from "./manus";

export interface JobVacancy {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  match: number;
  tags: string[];
  url?: string;
  content?: string;
  analyze?: string;
  summary?: string;
  remote?: boolean;
  area?: string;
  icon?: string;
  color?: string;
}

/**
 * Chama /api/chat/send com o vector store do currículo e retorna o texto completo.
 */
async function callChatSend(
  vectorStoreId: string,
  question: string,
  jsonMode = false
): Promise<string> {
  const response = await fetch("/api/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vectorStoreId, question, jsonMode }),
  });

  if (!response.ok) {
    throw new Error(`Erro na API: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Erro desconhecido");
  return data.text || "";
}

/**
 * Passo 1: Extrai análise completa do currículo em texto rico
 */
export async function extractResumeInfo(vectorStoreId: string): Promise<string> {
  const prompt = `Perform a complete and detailed analysis of the uploaded resume, extracting all relevant information. Write in continuous prose, as rich and thorough as possible:

- Professional identity: current or desired job title, area of expertise, and seniority level
- Career summary: companies, roles held, years of experience in each area, and main responsibilities
- Full technical stack: all programming languages, frameworks, tools, platforms, and technologies mentioned
- Relevant projects and achievements: what was built, delivered, or led
- Academic background and certifications
- Languages and proficiency levels
- Location and availability (remote, hybrid, on-site)
- Behavioral profile and soft skills identified
- Most relevant keywords for finding compatible job vacancies

Be thorough — the more context, the better the vacancy match will be.`;

  return await callChatSend(vectorStoreId, prompt);
}

/**
 * Passo 2: Gera uma query de busca objetiva a partir da análise do currículo
 */
export async function buildVacancyQuery(
  vectorStoreId: string,
  resumeInfo: string
): Promise<string> {
  const prompt = `Based on the resume analysis below, generate ONE short and objective search query to find compatible job vacancies.

The query must contain only: main job title + seniority level + top technologies/skills (max 5) + location.
Reply with the query ONLY — no explanations, no quotes, no extra punctuation.

Example of expected response:
Senior Frontend Developer React TypeScript Next.js São Paulo

RESUME ANALYSIS:
${resumeInfo}`;

  const query = await callChatSend(vectorStoreId, prompt);
  return query.trim().replace(/^["']|["']$/g, "");
}

// Paleta de cores para os ícones das empresas
const CARD_COLORS = [
  "#2e7dd1", "#22a06b", "#e8a020", "#9b59b6",
  "#d94f3d", "#1abc9c", "#e67e22", "#1a3a5c",
];

/**
 * Converte ManusVacancy[] em JobVacancy[]
 */
function manusToJobVacancies(manusVacancies: ManusVacancy[]): JobVacancy[] {
  return manusVacancies.map((v, i) => {
    const locationLower = (v.location || "").toLowerCase();
    const remote =
      locationLower.includes("remoto") ||
      locationLower.includes("home office") ||
      locationLower.includes("remote");

    return {
      id: `v${i + 1}`,
      url: v.url,
      content: v.content,
      analyze: v.analyze,
      summary: v.summary,
      title: v.title || `Vaga ${i + 1}`,
      company: v.company || "",
      location: v.location || "",
      salary: v.salary,
      match: v.match ?? 80 - i * 2,
      tags: v.tags || [],
      remote,
      area: v.area,
      icon: (v.company || "V").charAt(0).toUpperCase(),
      color: CARD_COLORS[i % CARD_COLORS.length],
    };
  });
}

/**
 * Passo 3: Busca vagas via Manus (com polling).
 */
export async function searchVacancies(
  vectorStoreId: string,
  resumeInfo: string,
  searchQuery?: string,
  onProgress?: (text: string) => void
): Promise<JobVacancy[]> {
  const query =
    searchQuery ?? (await buildVacancyQuery(vectorStoreId, resumeInfo));
  console.log("[searchVacancies] query:", query);
  onProgress?.(`Query: ${query}`);

  const manusVacancies = await searchVacanciesWithManus(
    query,
    resumeInfo,
    (status) => onProgress?.(`Manus: ${status}`)
  );
  console.log("[searchVacancies] vagas Manus:", manusVacancies.length);

  if (manusVacancies.length === 0) return [];

  return manusToJobVacancies(manusVacancies);
}
