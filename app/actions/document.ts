export interface UploadResponse {
  openaiFileId: string;
  vectorStoreId: string;
  fileName: string;
  warnings?: string[];
}

export async function uploadDocument(
  file: File,
  existingVectorStoreId?: string,
  existingFileId?: string,
  name?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (existingVectorStoreId) {
    formData.append("vectorStoreId", existingVectorStoreId);
  }
  if (existingFileId) {
    formData.append("existingFileId", existingFileId);
  }
  if (name) {
    formData.append("name", name);
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erro no upload: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteDocument(
  openaiFileId: string,
  vectorStoreId: string
): Promise<void> {
  const response = await fetch("/api/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ openaiFileId, vectorStoreId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao deletar arquivo");
  }
}

/**
 * Sobe o JSON das vagas encontradas como arquivo extra no vector store do usuário.
 * Isso permite que o chat responda perguntas sobre vagas específicas com contexto real.
 */
export async function uploadVacanciesToVectorStore(
  vectorStoreId: string,
  vacancies: object[]
): Promise<void> {
  const content = JSON.stringify(vacancies, null, 2);

  const response = await fetch("/api/upload", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vectorStoreId,
      content,
      filename: "vagas_encontradas.json",
      mimetype: "application/json",
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao subir vagas para o vector store");
  }
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamRequest {
  vectorStoreId: string;
  question: string;
  history?: HistoryMessage[];
}

export async function streamMessage(
  request: StreamRequest,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  if (!request.vectorStoreId) {
    onError("vectorStoreId inválido. Recarregue a página e tente novamente.");
    return;
  }

  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vectorStoreId: request.vectorStoreId,
      question: request.question,
      history: request.history ?? [],
    }),
  });

  if (!response.ok) {
    onError(`Erro na requisição: ${response.statusText}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError("Não foi possível ler a resposta");
    return;
  }

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.text) {
            onChunk(parsed.text);
          }
        } catch {
          // ignora linhas inválidas
        }
      }
    }
  }
  onDone();
}
