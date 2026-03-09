import axios from "axios";
import { apiIaUrl, apiIaToken } from "./constant";

export interface SessionResponse {
  sessionId: string;
}

export async function createSession(
  botId: string,
  clientId: string,
  name?: string
): Promise<SessionResponse> {
  const response = await axios.post(
    `${apiIaUrl}/sessions/client/external`,
    {
      botId,
      clientId,
      name: name || "Usuário",
    },
    {
      headers: {
        "x-api-key": apiIaToken,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}
