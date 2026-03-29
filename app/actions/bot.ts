export interface BotResponse {
  id: string;
  name: string;
  vectorStoreId: string;
}

/**
 * No novo fluxo com OpenAI, o "bot" é representado pelo vector store.
 * A criação real do vector store acontece durante o upload do arquivo
 * via /api/upload. Aqui apenas retornamos um objeto local com o ID
 * salvo no localStorage (se existir).
 */
export function getBotFromStorage(): BotResponse | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem("job_bot_id");
  const vectorStoreId = localStorage.getItem("job_vector_store_id");
  if (!id || !vectorStoreId) return null;
  return { id, name: "Currículo - Site Vagas", vectorStoreId };
}

export function saveBotToStorage(id: string, vectorStoreId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("job_bot_id", id);
  localStorage.setItem("job_vector_store_id", vectorStoreId);
}

export function clearBotFromStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("job_bot_id");
  localStorage.removeItem("job_vector_store_id");
  localStorage.removeItem("job_openai_file_id");
  localStorage.removeItem("job_file_name");
  localStorage.removeItem("job_session_id");
  localStorage.removeItem("job_resume_info");
  localStorage.removeItem("job_vacancies");
}
