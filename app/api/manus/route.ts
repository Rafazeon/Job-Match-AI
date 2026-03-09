import { NextRequest, NextResponse } from "next/server";

const MANUS_API_KEY = process.env.MANUS_API_KEY;
const MANUS_BASE_URL = "https://api.manus.ai/v1/tasks";

const HEADERS = {
  API_KEY: MANUS_API_KEY || "",
  "Content-Type": "application/json",
};

// POST /api/manus — cria a task e retorna o task_id imediatamente
export async function POST(request: NextRequest) {
  try {
    const { searchQuery, resumeInfo } = await request.json();

    if (!searchQuery) {
      return NextResponse.json({ error: "searchQuery é obrigatório" }, { status: 400 });
    }

    const prompt = `Você é um especialista em recrutamento com foco em precisão de match de perfil.

🚫 RESTRIÇÕES ABSOLUTAS — leia antes de qualquer ação:
- NÃO crie páginas web, arquivos HTML, dashboards ou qualquer tipo de interface visual
- NÃO crie arquivos de nenhum tipo (CSV, PDF, TXT, JSON em disco, etc.) — nem mesmo um arquivo .json
- NÃO execute código, scripts ou programas
- NÃO faça nada além do que está descrito nas etapas abaixo
- Sua ÚNICA saída deve ser o array JSON escrito DIRETAMENTE no chat, em texto puro, sem salvar em arquivo
- O array JSON deve aparecer como sua mensagem final, visível diretamente na conversa

⛔ REGRAS ANTI-LOOP — siga rigorosamente:
- Acesse CADA site de vagas UMA ÚNICA VEZ — não repita buscas no mesmo portal
- Ao encontrar as vagas válidas, PARE IMEDIATAMENTE a busca e gere o JSON final
- NÃO continue navegando após atingir as vagas válidas
- NÃO tente melhorar ou refinar os resultados após encontrar as as vagas válidas
- Se um site não retornar resultados relevantes após 1 tentativa, passe para o próximo
- Ordem de busca: 1º Gupy → 2º Catho → 3º InfoJobs → 4º Vagas.com → pare assim que tiver as vagas válidas

Sua tarefa tem três etapas:

## PERFIL DO CANDIDATO
${resumeInfo || "Não informado"}

## ETAPA 1 — Extração do Perfil Profissional
Antes de buscar qualquer vaga, leia atentamente o perfil acima e identifique com precisão:
- Cargo/função principal do candidato
- Área de atuação profissional (ex: Direito, Saúde, Educação, Engenharia, Finanças, Tecnologia, Administração, etc.)
- Nível de senioridade (estagiário, júnior, pleno, sênior, especialista, gerente, diretor, etc.)
- Habilidades, conhecimentos e competências EXATAS que o candidato possui, conforme descritas no currículo
- Especialidades ou subáreas de destaque dentro da área principal

## ETAPA 2 — Busca de Vagas com Filtro Rigoroso de Compatibilidade
Busque vagas nos principais sites: Gupy, Catho, InfoJobs, Glassdoor, Vagas.com.
Acesse a página de cada vaga individualmente para extrair o conteúdo completo.

⚠️ REGRAS OBRIGATÓRIAS DE FILTRO — aplique ANTES de incluir qualquer vaga:
1. A vaga deve ser da MESMA área de atuação profissional do candidato — não inclua vagas de áreas completamente diferentes
2. A vaga deve exigir PELO MENOS 70% das habilidades e competências que o candidato possui
3. NÃO inclua vagas que exijam conhecimentos ou especializações que o candidato claramente não possui
4. O nível de senioridade da vaga deve ser compatível com o do candidato (±1 nível)
5. Só inclua a vaga se o candidato teria REAL chance de aprovação com base no perfil descrito no currículo

Encontre 10 vagas que passem por TODOS os filtros acima.

## ETAPA 3 — Análise de Compatibilidade por Perfil
Para cada vaga selecionada, faça uma análise detalhada comparando os requisitos da vaga com o perfil real do candidato.

## RETORNO ESPERADO
Retorne APENAS um array JSON válido, sem texto adicional:
[
  {
    "url": "URL direta da vaga (não listagem)",
    "title": "Título exato do cargo",
    "company": "Nome da empresa",
    "location": "Cidade, Estado ou Remoto",
    "salary": "Faixa salarial ou null",
    "match": 85,
    "tags": ["competencia1", "competencia2", "competencia3"],
    "area": "subárea da vaga em 1 palavra minúscula (ex: bancario, familia, civil, saude, educacao, financas, etc.)",
    "summary": "Resumo em 1 linha: cargo + empresa + modelo de trabalho + salário (ex: Advogada Sênior · Escritório XYZ · Presencial · R$ 8.000/mês)",
    "content": "Conteúdo completo da vaga em HTML simples usando apenas <b>, <ul> e <li>: título, empresa, localização, salário, modelo de trabalho, requisitos, responsabilidades, benefícios",
    "analyze": "Análise estruturada em blocos separados por quebra de linha. Use EXATAMENTE este formato:\n✅ [ponto forte 1 — competência do candidato que atende ao requisito da vaga]\n✅ [ponto forte 2]\n⚠️ [lacuna 1 — requisito da vaga que o candidato não possui ou possui parcialmente]\n⚠️ [lacuna 2]\n💡 [dica 1 — ação concreta que o candidato pode tomar para aumentar as chances]\n💡 [dica 2]\n📊 Probabilidade de aprovação: [percentual]% — [justificativa em 1 frase]\nGere pelo menos 2 itens de cada tipo (✅ ⚠️ 💡) e sempre inclua a linha 📊 ao final."
  }
]

⚠️ IMPORTANTE: O campo 'match' deve refletir SOMENTE a sobreposição real entre o perfil do candidato e os requisitos da vaga. Não inclua vagas com match abaixo de 60%.`;

    const response = await fetch(MANUS_BASE_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        prompt,
        agentProfile: "manus-1.6-lite",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Manus API erro: ${response.status}`, detail: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Retorna task_id para o cliente fazer polling
    return NextResponse.json({
      task_id: data.id || data.task_id,
      task_url: data.metadata?.task_url,
      status: data.status,
    });
  } catch (error) {
    console.error("[/api/manus POST] erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// GET /api/manus?task_id=xxx — consulta o status/resultado da task
export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json({ error: "task_id é obrigatório" }, { status: 400 });
    }

    const response = await fetch(`${MANUS_BASE_URL}/${taskId}`, {
      method: "GET",
      headers: HEADERS,
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Manus API erro: ${response.status}`, detail: text },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log completo para debug da estrutura do Manus
    console.log("[/api/manus GET] data keys:", Object.keys(data));
    console.log("[/api/manus GET] status:", data.status);
    if (data.status === "completed") {
      console.log("[/api/manus GET] data completo:", JSON.stringify(data).slice(0, 2000));
    }

    // Extrai o texto final do output quando completed
    // Tenta múltiplas estruturas possíveis da API do Manus
    let resultText = "";

    if (data.status === "completed") {
      // Estrutura 1: data.output é array de mensagens
      if (Array.isArray(data.output)) {
        for (const msg of data.output) {
          // Pega a última mensagem do assistente com conteúdo
          if (msg.role === "assistant") {
            if (Array.isArray(msg.content)) {
              for (const c of msg.content) {
                if (c.text) resultText += c.text;
              }
            } else if (typeof msg.content === "string") {
              resultText += msg.content;
            }
          }
        }
        // Se pegou múltiplas mensagens, usa apenas a última (que tem o JSON final)
        if (resultText) {
          // Tenta encontrar o JSON dentro do texto completo
          const jsonMatch = resultText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            resultText = jsonMatch[0];
          } else {
            // Pega apenas a última mensagem do assistente
            const lastAssistant = [...data.output].reverse().find(
              (m: { role: string; content: unknown }) => m.role === "assistant"
            );
            if (lastAssistant) {
              if (Array.isArray(lastAssistant.content)) {
                resultText = lastAssistant.content
                  .map((c: { text?: string }) => c.text || "")
                  .join("");
              } else if (typeof lastAssistant.content === "string") {
                resultText = lastAssistant.content;
              }
            }
          }
        }
      }

      // Estrutura 2: data.result direto
      if (!resultText && data.result) {
        resultText = typeof data.result === "string"
          ? data.result
          : JSON.stringify(data.result);
      }

      // Estrutura 3: data.response direto
      if (!resultText && data.response) {
        resultText = typeof data.response === "string"
          ? data.response
          : JSON.stringify(data.response);
      }
    }

    return NextResponse.json({
      status: data.status,
      error: data.error,
      task_url: data.metadata?.task_url,
      result: resultText || null,
      // Passa o raw para debug no cliente
      _raw_keys: Object.keys(data),
    });
  } catch (error) {
    console.error("[/api/manus GET] erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
