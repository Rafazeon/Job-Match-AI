import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[Webhook] Notificação recebida:", JSON.stringify(body, null, 2));

    // O corpo esperado é:
    // {
    //   userId: string,
    //   message: {
    //     botId: string,
    //     originalname: string,
    //     mimetype: string,
    //     status: 'completed' | 'error' | 'queued'
    //   }
    // }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Webhook] Erro ao processar notificação:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
