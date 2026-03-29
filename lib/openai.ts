import OpenAI, { toFile } from "openai";
import { Readable } from "stream";

const SUPPORTED_MIMETYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");
  return new OpenAI({ apiKey });
}

export async function uploadFileToOpenAI(
  fileBuffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> {
  const openai = getOpenAIClient();
  const stream = Readable.from(fileBuffer);
  const file = await toFile(stream, filename, { type: mimetype });

  const uploaded = await openai.files.create({
    file,
    purpose: "assistants",
  });

  console.log(`[OpenAI] Arquivo enviado: ${uploaded.id} (${filename})`);
  return uploaded.id;
}

export async function ensureVectorStore(
  name: string,
  existingVectorStoreId: string | null | undefined,
  openaiFileId: string
): Promise<{ vectorStoreId: string; usageBytes: number }> {
  const openai = getOpenAIClient();

  let vsId: string;

  if (existingVectorStoreId) {
    vsId = existingVectorStoreId;
  } else {
    const vectorStore = await openai.vectorStores.create({ name });
    vsId = vectorStore.id;
    console.log(`[OpenAI] Vector store criado: ${vsId}`);
  }

  const vsFile = await openai.vectorStores.files.createAndPoll(vsId, {
    file_id: openaiFileId,
  });

  const usageBytes = vsFile.usage_bytes ?? 0;
  console.log(
    `[OpenAI] Arquivo ${openaiFileId} indexado no VS ${vsId} — usage_bytes: ${usageBytes}`
  );

  return { vectorStoreId: vsId, usageBytes };
}

export async function addFileToVectorStore(
  vectorStoreId: string,
  fileBuffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> {
  const openai = getOpenAIClient();
  const stream = Readable.from(fileBuffer);
  const file = await toFile(stream, filename, { type: mimetype });

  const uploaded = await openai.files.create({
    file,
    purpose: "assistants",
  });

  await openai.vectorStores.files.createAndPoll(vectorStoreId, {
    file_id: uploaded.id,
  });

  console.log(`[OpenAI] Arquivo ${uploaded.id} (${filename}) adicionado ao VS ${vectorStoreId}`);
  return uploaded.id;
}

export async function deleteFileFromOpenAI(
  openaiFileId: string,
  vectorStoreId: string
): Promise<void> {
  const openai = getOpenAIClient();

  try {
    await openai.vectorStores.files.delete(openaiFileId, {
      vector_store_id: vectorStoreId,
    });
    console.log(
      `[OpenAI] Arquivo ${openaiFileId} removido do vector store ${vectorStoreId}`
    );
  } catch (err) {
    console.warn(`[OpenAI] Falha ao remover arquivo do vector store:`, err);
  }

  try {
    await openai.files.delete(openaiFileId);
    console.log(`[OpenAI] Arquivo ${openaiFileId} deletado da Files API`);
  } catch (err) {
    console.warn(`[OpenAI] Falha ao deletar arquivo da Files API:`, err);
  }
}

const SYSTEM_PROMPT_RESUME = `You are a specialist assistant in resume analysis and job vacancy search.
Always prioritize information from the uploaded documents to answer questions.
When the document does not contain the requested information, you may supplement with general knowledge, but clearly indicate when doing so.
LANGUAGE RULE: Always detect the language of the user's message and respond strictly in that same language, regardless of the language of the documents.`;

const SYSTEM_PROMPT_JSON = `You are a specialist assistant in resume analysis and job vacancy search.
Always prioritize information from the uploaded documents to answer questions.
Detect the language used in the resume or in the user's message and respond in that same language.
IMPORTANT: Return ONLY valid, pure JSON — no extra text, no markdown, no code blocks.`;

export async function callAIWithVectorStore(
  vectorStoreId: string,
  prompt: string,
  model = "gpt-4.1-mini",
  jsonMode = false
): Promise<string> {
  const openai = getOpenAIClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (openai as any).responses.create({
    model,
    instructions: jsonMode ? SYSTEM_PROMPT_JSON : SYSTEM_PROMPT_RESUME,
    input: [{ role: "user", content: prompt }],
    temperature: 0.0,
    top_p: 0.5,
    presence_penalty: 0.5,
    frequency_penalty: 0.5,
    max_output_tokens: 8000,
    ...(jsonMode ? { text: { format: { type: "json_object" } } } : {}),
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text: string = ((response as any).output_text ?? "")
    .replace(/【[^】]*】/g, "")
    .trim();

  console.log(
    `[OpenAI] Resposta recebida (${text.length} chars) jsonMode=${jsonMode}`
  );
  return text;
}

export { SUPPORTED_MIMETYPES };
