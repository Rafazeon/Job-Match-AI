import { apiIaUrl, apiIaToken } from "./constant";
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

// Coleta todo o texto de um stream SSE e retorna como string
async function collectStream(sessionId: string, question: string): Promise<string> {
  const response = await fetch(`${apiIaUrl}/documents/client/external/stream`, {
    method: "POST",
    headers: {
      "x-api-key": apiIaToken || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      question,
      language: "pt-BR",
      saveHistory: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro na API: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Não foi possível ler a resposta");

  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return fullText;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) fullText += parsed.text;
          if (parsed.error) throw new Error(parsed.error);
        } catch {
          // ignora linhas inválidas
        }
      }
    }
  }

  return fullText;
}

// Tenta extrair JSON de uma string que pode ter texto ao redor
function extractJSON(text: string): unknown {
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch { /* continua */ }
  }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch { /* continua */ }
  }
  return null;
}

/**
 * Passo 1: Extrai análise completa do currículo em texto rico
 */
export async function extractResumeInfo(sessionId: string): Promise<string> {
  const prompt = `Faça uma análise completa e detalhada do currículo enviado, extraindo todas as informações relevantes. Escreva em texto corrido, sendo o mais rico e completo possível:

- Identidade profissional: cargo atual ou desejado, área de atuação e nível de senioridade
- Resumo da trajetória: empresas, cargos ocupados, tempo de experiência em cada área e principais responsabilidades
- Stack técnica completa: todas as linguagens, frameworks, ferramentas, plataformas e tecnologias mencionadas
- Projetos e realizações relevantes: o que construiu, entregou ou liderou
- Formação acadêmica e certificações
- Idiomas e nível
- Localização e disponibilidade (remoto, híbrido, presencial)
- Perfil comportamental e soft skills identificados
- Palavras-chave mais relevantes para busca de vagas compatíveis com esse perfil

Seja detalhado — quanto mais contexto, melhor será o match com as vagas.`;

  return await collectStream(sessionId, prompt);
}

/**
 * Passo 2: Gera uma query de busca objetiva a partir da análise do currículo
 */
export async function buildVacancyQuery(sessionId: string, resumeInfo: string): Promise<string> {
  const prompt = `Com base na análise do currículo abaixo, gere UMA query de busca curta e objetiva para encontrar vagas compatíveis.

A query deve conter apenas: cargo principal + nível de senioridade + principais tecnologias/habilidades (máx. 5) + localização.
Responda APENAS com a query, sem explicações, sem aspas, sem pontuação extra.

Exemplo de resposta esperada:
Desenvolvedor Frontend Pleno React TypeScript Next.js São Paulo

ANÁLISE DO CURRÍCULO:
${resumeInfo}`;

  const query = await collectStream(sessionId, prompt);
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
      match: v.match ?? (80 - i * 2),
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
 * Aceita searchQuery já gerado ou gera internamente se não fornecido.
 */
export async function searchVacancies(
  sessionId: string,
  resumeInfo: string,
  searchQuery?: string,
  onProgress?: (text: string) => void
): Promise<JobVacancy[]> {
  // Gera a query se não foi passada
  const query = searchQuery ?? await buildVacancyQuery(sessionId, resumeInfo);
  console.log("[searchVacancies] query:", query);
  onProgress?.(`Query: ${query}`);

  // Manus cria a task, faz scraping + análise e retorna quando completo
  const manusVacancies = await searchVacanciesWithManus(
    query,
    resumeInfo,
    (status) => onProgress?.(`Manus: ${status}`)
  );
  console.log("[searchVacancies] vagas Manus:", manusVacancies.length);

  if (manusVacancies.length === 0) return [];

  return manusToJobVacancies(manusVacancies);
}
