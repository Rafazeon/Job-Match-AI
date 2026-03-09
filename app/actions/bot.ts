import axios from "axios";
import { apiIaUrl, apiIaToken } from "./constant";

export interface BotResponse {
  userId: string;
  name: string;
  avatar: string;
  show_relevant_questions: boolean;
  show_fonts: boolean;
  enable_image_creation: boolean;
  custom_prompt: string;
  custom_hybrid_search: string;
  storage: unknown[];
  id: string;
  createdAt: string;
  updatedAt: string;
}

export async function createBot(name: string): Promise<BotResponse> {
  const response = await axios.post(
    `${apiIaUrl}/bots/client/external`,
    {
      webhookId: process.env.BOT_EBOTMAKER_WEBHOOK_ID,
      name,
      show_relevant_questions: true,
      show_fonts: false,
      enable_image_creation: false,
      custom_prompt:
        "Você é um assistente especializado em análise de currículos e busca de vagas de emprego. Analise o currículo do usuário e ajude-o a encontrar as melhores oportunidades de trabalho compatíveis com seu perfil.",
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
