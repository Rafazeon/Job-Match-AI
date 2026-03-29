export interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  sessionId: string;
  messages: ChatMessage[];
}

/**
 * Histórico de chat gerenciado localmente no localStorage.
 */
export function getChatHistory(sessionId: string): ChatHistoryResponse {
  if (typeof window === "undefined") return { sessionId, messages: [] };
  try {
    const raw = localStorage.getItem(`chat_history_${sessionId}`);
    const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
    return { sessionId, messages };
  } catch {
    return { sessionId, messages: [] };
  }
}

export function saveChatMessage(sessionId: string, message: ChatMessage): void {
  if (typeof window === "undefined") return;
  const { messages } = getChatHistory(sessionId);
  messages.push(message);
  localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(messages));
}

export function clearChatHistory(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`chat_history_${sessionId}`);
}
