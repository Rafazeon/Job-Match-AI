import { NextRequest, NextResponse } from "next/server";
import { callAIWithVectorStore } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vectorStoreId, question, model, jsonMode } = body;

    if (!vectorStoreId || !question) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: vectorStoreId, question" },
        { status: 400 }
      );
    }

    const result = await callAIWithVectorStore(
      vectorStoreId,
      question,
      model || "gpt-4.1-mini",
      jsonMode ?? false
    );

    return NextResponse.json({ success: true, text: result });
  } catch (error) {
    console.error("[chat/send] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API de envio de mensagens funcionando",
    configured: !!process.env.OPENAI_API_KEY,
  });
}
