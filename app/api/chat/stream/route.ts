import { NextRequest } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a specialist assistant in resume analysis and job vacancy search.
Always prioritize information from the uploaded documents to answer questions.
When the document does not contain the requested information, you may supplement with general knowledge, but clearly indicate when doing so.
Be concise and direct — only answer what was asked, do not expand or add unsolicited information.
If the user sends a short acknowledgement (e.g. "ok", "understood", "got it", "entendi", "certo"), reply briefly and wait for the next question.
LANGUAGE RULE: Always detect the language of the user's message and respond strictly in that same language, regardless of the language of the documents.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vectorStoreId, question, model = "gpt-4.1-mini", history = [] } = body;

    if (!vectorStoreId || !question) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: vectorStoreId, question" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Build conversation input: prior turns + current user message
    const historyInput = (history as { role: string; content: string }[]).map(
      (m) => ({ role: m.role, content: m.content })
    );
    const input = [...historyInput, { role: "user", content: question }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await (openai as any).responses.stream({
      model,
      instructions: SYSTEM_PROMPT,
      input,
      temperature: 0.3,
      max_output_tokens: 4000,
      tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "response.output_text.delta" &&
              typeof event.delta === "string"
            ) {
              const clean = event.delta.replace(/【[^】]*】/g, "");
              if (clean) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: clean })}\n\n`)
                );
              }
            }

            if (event.type === "response.completed") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro no stream";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[chat/stream] Erro:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
