export interface ManusVacancy {
  url: string;
  content: string;
  analyze: string;
  summary: string;
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  match?: number;
  tags?: string[];
  area?: string;
}

const POLL_INTERVAL_MS = 30000;
const POLL_TIMEOUT_MS = 1200000; // 20 minutos de timeout máximo

/**
 * Cria a task no Manus e faz polling até completar
 */
export async function searchVacanciesWithManus(
  searchQuery: string,
  resumeInfo: string,
  onStatus?: (status: string) => void
): Promise<ManusVacancy[]> {
  // Passo 1 — cria a task
  const createRes = await fetch("/api/manus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchQuery, resumeInfo }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Manus erro ao criar task: ${err.error || createRes.statusText}`);
  }

  const { task_id, task_url } = await createRes.json();
  console.log("[Manus] task criada:", task_id, task_url);

  if (!task_id) throw new Error("Manus não retornou task_id");

  // Passo 2 — polling até completed ou failed
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(`/api/manus?task_id=${task_id}`);
    if (!pollRes.ok) {
      console.warn("[Manus] erro no polling, tentando novamente...");
      continue;
    }

    const poll = await pollRes.json();
    console.log("[Manus] poll completo:", JSON.stringify(poll).slice(0, 1000));
    onStatus?.(poll.status);

    if (poll.status === "failed") {
      throw new Error(`Manus task falhou: ${poll.error || "erro desconhecido"}`);
    }

    if (poll.status === "completed") {
      return parseManusVacancies(poll.result || "");
    }
  }

  throw new Error("Manus timeout: task não completou em 5 minutos");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseManusVacancies(raw: string): ManusVacancy[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (v) => v && typeof v.url === "string"
        ).map((v) => ({
          url: v.url,
          content: v.content || "",
          analyze: v.analyze || "",
          summary: v.summary || "",
          title: v.title,
          company: v.company,
          location: v.location,
          salary: v.salary,
          match: typeof v.match === "number" ? v.match : undefined,
          tags: Array.isArray(v.tags) ? v.tags : [],
          area: v.area,
        }));
      }
    } catch { /* continua */ }
  }

  console.warn("[Manus] Não foi possível parsear vagas. Raw:", raw.slice(0, 500));
  return [];
}
