import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { prompt, maxTokens = 500, temperature = 0 } = await request.json();

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json({ error: "prompt inválido" }, { status: 400 });
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = response.data.choices?.[0]?.message?.content || "";
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[/api/openai] erro:", error);
    return NextResponse.json({ error: "Erro ao chamar OpenAI" }, { status: 500 });
  }
}
