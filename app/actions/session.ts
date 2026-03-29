import { v4 as uuidv4 } from "uuid";

export interface SessionResponse {
  sessionId: string;
}

/**
 * No novo fluxo com OpenAI, a sessão é gerenciada localmente.
 * O sessionId é apenas um identificador local para o histórico de chat
 * armazenado no localStorage.
 */
export function createSession(
  _botId: string,
  _clientId: string,
  _name?: string
): SessionResponse {
  const sessionId = uuidv4();
  return { sessionId };
}
