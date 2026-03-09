import axios from "axios";
import { apiIaUrl, apiIaToken } from "./constant";

export interface UploadResponse {
  userId: string;
  botId: string;
  files: {
    status: string;
    originalname: string;
    createdAt: string;
  }[];
  webhook_url?: string;
}

export async function uploadDocument(
  botId: string,
  file: File,
  webhookUrl?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("botId", botId);
  formData.append("files", file);
  if (webhookUrl) {
    formData.append("webhook_url", webhookUrl);
  }

  const response = await axios.post(
    `${apiIaUrl}/documents/client/external/files`,
    formData,
    {
      headers: {
        "x-api-key": apiIaToken,
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

export async function uploadVacanciesFile(
  botId: string,
  vacancies: object[]
): Promise<void> {
  const json = JSON.stringify(vacancies, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const file = new File([blob], "vagas_encontradas.json", { type: "application/json" });

  const formData = new FormData();
  formData.append("botId", botId);
  formData.append("files", file);

  await axios.post(
    `${apiIaUrl}/documents/client/external/files`,
    formData,
    {
      headers: {
        "x-api-key": apiIaToken,
        "Content-Type": "multipart/form-data",
      },
    }
  );
}

export async function deleteDocument(
  botId: string,
  fileName: string
): Promise<void> {
  await axios.delete(`${apiIaUrl}/documents/client/external/files`, {
    headers: {
      "x-api-key": apiIaToken,
      "Content-Type": "application/json",
    },
    data: {
      botId,
      name: fileName,
    },
  });
}

export interface StreamRequest {
  sessionId: string;
  question: string;
  language?: string;
  saveHistory?: boolean;
}

export async function streamMessage(
  request: StreamRequest,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  console.log("[streamMessage] sessionId:", request.sessionId);

  if (!request.sessionId) {
    onError("sessionId inválido ou nulo. Recarregue a página e tente novamente.");
    return;
  }

  const response = await fetch(`${apiIaUrl}/documents/client/external/stream`, {
    method: "POST",
    headers: {
      "x-api-key": apiIaToken || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId: request.sessionId,
      question: request.question,
      language: request.language || "pt-BR",
      saveHistory: request.saveHistory !== false,
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
