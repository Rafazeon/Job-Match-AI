import { NextRequest, NextResponse } from "next/server";
import {
  uploadFileToOpenAI,
  ensureVectorStore,
  addFileToVectorStore,
  deleteFileFromOpenAI,
  SUPPORTED_MIMETYPES,
} from "@/lib/openai";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const existingVectorStoreId =
      (formData.get("vectorStoreId") as string | null) || undefined;
    const existingFileId =
      (formData.get("existingFileId") as string | null) || undefined;
    const name = (formData.get("name") as string | null) || "Currículo";

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Arquivo excede o limite de 10MB" },
        { status: 400 }
      );
    }

    if (
      !SUPPORTED_MIMETYPES.includes(file.type) &&
      !file.name.endsWith(".docx")
    ) {
      return NextResponse.json(
        { error: "Formato inválido. Use PDF, DOCX ou TXT." },
        { status: 400 }
      );
    }

    // Remove arquivo anterior se existir
    if (existingFileId && existingVectorStoreId) {
      await deleteFileFromOpenAI(existingFileId, existingVectorStoreId);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const openaiFileId = await uploadFileToOpenAI(
      buffer,
      file.name,
      file.type || "application/octet-stream"
    );

    const { vectorStoreId, usageBytes } = await ensureVectorStore(
      name,
      existingVectorStoreId,
      openaiFileId
    );

    const warnings: string[] = [];
    if (
      usageBytes === 0 &&
      (file.type === "application/pdf" || file.name.endsWith(".pdf"))
    ) {
      warnings.push(
        `O arquivo "${file.name}" parece ser um PDF escaneado (sem texto). Use PDFs com texto real para melhores resultados.`
      );
    }

    return NextResponse.json({
      success: true,
      openaiFileId,
      vectorStoreId,
      fileName: file.name,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    console.error("[/api/upload] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/upload
 * Adiciona um arquivo extra (ex: JSON de vagas) a um vector store já existente.
 * Body: { vectorStoreId, content (string), filename, mimetype? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { vectorStoreId, content, filename, mimetype = "application/json" } =
      await request.json();

    if (!vectorStoreId || !content || !filename) {
      return NextResponse.json(
        { error: "vectorStoreId, content e filename são obrigatórios" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(content, "utf-8");
    const openaiFileId = await addFileToVectorStore(
      vectorStoreId,
      buffer,
      filename,
      mimetype
    );

    return NextResponse.json({ success: true, openaiFileId });
  } catch (error) {
    console.error("[/api/upload PATCH] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao adicionar arquivo ao vector store",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { openaiFileId, vectorStoreId } = await request.json();

    if (!openaiFileId || !vectorStoreId) {
      return NextResponse.json(
        { error: "openaiFileId e vectorStoreId são obrigatórios" },
        { status: 400 }
      );
    }

    await deleteFileFromOpenAI(openaiFileId, vectorStoreId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/upload DELETE] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao deletar arquivo" },
      { status: 500 }
    );
  }
}
