import axios from "axios";
import { apiIaUrl, apiIaToken } from "./constant";

export interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  sessionId: string;
  messages: ChatMessage[];
}

export async function getChatHistory(
  sessionId: string
): Promise<ChatHistoryResponse> {
  const response = await axios.get(
    `${apiIaUrl}/chats/session/external/${sessionId}`,
    {
      headers: {
        "x-api-key": apiIaToken,
      },
    }
  );
  return response.data;
}

export async function clearChatHistory(sessionId: string): Promise<void> {
  await axios.post(
    `${apiIaUrl}/chats/session/external/clear`,
    { sessionId },
    {
      headers: {
        "x-api-key": apiIaToken,
        "Content-Type": "application/json",
      },
    }
  );
}
