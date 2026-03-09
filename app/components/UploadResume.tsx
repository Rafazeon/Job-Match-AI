"use client";

import { useState, useRef, useCallback } from "react";
import { createBot } from "../actions/bot";
import { uploadDocument, uploadVacanciesFile } from "../actions/document";
import { createSession } from "../actions/session";
import { extractResumeInfo, buildVacancyQuery, searchVacancies, JobVacancy } from "../actions/vacancy";
import { v4 as uuidv4 } from "uuid";

interface UploadResumeProps {
  onComplete: (data: {
    botId: string;
    sessionId: string;
    clientId: string;
    fileName: string;
    vacancies: JobVacancy[];
    loadingMindMap?: boolean;
  }) => void;
}

type UploadStep =
  | "idle"
  | "creating_bot"
  | "uploading"
  | "creating_session"
  | "extracting"
  | "building_query"
  | "searching"
  | "done"
  | "error";

export default function UploadResume({ onComplete }: UploadResumeProps) {
  const [step, setStep] = useState<UploadStep>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [isReturningUser, setIsReturningUser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getOrCreateClientId = (): string => {
    if (typeof window === "undefined") return uuidv4();
    let clientId = localStorage.getItem("job_client_id");
    if (!clientId) {
      clientId = uuidv4();
      localStorage.setItem("job_client_id", clientId);
    }
    return clientId;
  };

  const processFile = useCallback(async (file: File) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!allowed.includes(file.type) && !file.name.endsWith(".docx")) {
      setErrorMsg("Formato inválido. Use PDF, DOCX ou TXT.");
      setStep("error");
      return;
    }

    setFileName(file.name);
    setErrorMsg("");

    try {
      const clientId = getOrCreateClientId();
      const existingBotId = localStorage.getItem("job_bot_id");
      const existingFileName = localStorage.getItem("job_file_name");

      let botId: string;

      if (existingBotId) {
        // Usuário já tem bot — reutiliza e deleta o arquivo antigo
        setIsReturningUser(true);
        setStep("creating_bot");
        botId = existingBotId;

      } else {
        // Novo usuário — cria o bot
        setStep("creating_bot");
        const bot = await createBot("Currículo - Site Vagas");
        botId = bot.id;
        localStorage.setItem("job_bot_id", botId);
      }

      // 2. Upload do novo currículo
      setStep("uploading");
      const webhookUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/webhook`
          : undefined;
      await uploadDocument(botId, file, webhookUrl);

      // 3. Criar sessão
      setStep("creating_session");
      const session = await createSession(botId, clientId, "Candidato");
      localStorage.setItem("job_session_id", session.sessionId);
      localStorage.setItem("job_bot_id", botId);
      localStorage.setItem("job_file_name", file.name);

      // 4. Aguarda o processamento do arquivo pelo bot (indexação)
      setStep("extracting");
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Extrai análise completa do currículo em texto rico
      const resumeInfo = await extractResumeInfo(session.sessionId);
      console.log("[extractResumeInfo] resultado (primeiros 500 chars):", resumeInfo.slice(0, 500));

      if (!resumeInfo || resumeInfo.trim().length < 50) {
        // Se ainda não processou, aguarda mais e tenta novamente
        console.warn("[extractResumeInfo] resposta muito curta, aguardando mais 10s...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        const resumeInfoRetry = await extractResumeInfo(session.sessionId);
        console.log("[extractResumeInfo] retry resultado:", resumeInfoRetry.slice(0, 500));
        localStorage.setItem("job_resume_info", resumeInfoRetry || resumeInfo);
      } else {
        localStorage.setItem("job_resume_info", resumeInfo);
      }

      const finalResumeInfo = localStorage.getItem("job_resume_info") || resumeInfo;

      // 5. Gerar query de busca
      setStep("building_query");
      const searchQuery = await buildVacancyQuery(session.sessionId, finalResumeInfo);
      console.log("[buildVacancyQuery] query:", searchQuery);

      // 6. Redireciona para a interface com mapa em loading — Manus roda em background
      setStep("done");
      onComplete({
        botId: botId,
        sessionId: session.sessionId,
        clientId,
        fileName: file.name,
        vacancies: [],
        loadingMindMap: true,
      });

      // 7. Busca Manus em background (após redirecionamento)
      try {
        const vacancies = await searchVacancies(session.sessionId, finalResumeInfo, searchQuery);
        localStorage.setItem("job_vacancies", JSON.stringify(vacancies));

        // 8. Sobe o JSON das vagas no bot do usuário
        try {
          await uploadVacanciesFile(botId, vacancies);
        } catch (uploadErr) {
          console.warn("[uploadVacanciesFile] Não foi possível subir o arquivo de vagas:", uploadErr);
        }

        // Notifica a interface com as vagas reais via localStorage event
        window.dispatchEvent(new CustomEvent("vacancies_ready", { detail: vacancies }));
      } catch (searchErr) {
        console.error("[searchVacancies background]", searchErr);
        window.dispatchEvent(new CustomEvent("vacancies_ready", { detail: [] }));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocorreu um erro ao processar seu currículo. Tente novamente.");
      setStep("error");
    }
  }, [onComplete]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const stepLabels: Record<UploadStep, string> = {
    idle: "",
    creating_bot: isReturningUser
      ? "Atualizando currículo no assistente existente..."
      : "Criando seu assistente de vagas...",
    uploading: "Enviando currículo para análise...",
    creating_session: "Iniciando sessão...",
    extracting: "Analisando currículo em profundidade...",
    building_query: "Montando query de busca personalizada...",
    searching: "Buscando vagas compatíveis na web...",
    done: "Tudo pronto! Redirecionando...",
    error: "",
  };

  const isLoading = ["creating_bot", "uploading", "creating_session", "extracting", "building_query", "searching"].includes(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 mb-4 shadow-lg shadow-purple-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Match AI</h1>
          <p className="text-slate-400 text-sm">
            Encontre as melhores vagas compatíveis com seu perfil
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {!isLoading && step !== "done" ? (
            <>
              <h2 className="text-xl font-semibold text-white mb-2 text-center">
                Suba seu currículo para começarmos
              </h2>
              <p className="text-slate-400 text-sm text-center mb-6">
                Nossa IA irá analisar seu perfil e encontrar as vagas mais compatíveis
              </p>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
                  ${dragOver
                    ? "border-purple-400 bg-purple-500/10"
                    : "border-slate-600 hover:border-purple-500 hover:bg-purple-500/5"
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${dragOver ? "bg-purple-500/20" : "bg-slate-700"}`}>
                    <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {dragOver ? "Solte aqui!" : "Arraste seu currículo ou clique para selecionar"}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">PDF, DOCX ou TXT • Máx. 10MB</p>
                  </div>
                </div>
              </div>

              {/* Erro */}
              {step === "error" && errorMsg && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                </div>
              )}

              {/* Recursos */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { icon: "🔍", label: "Análise de IA" },
                  { icon: "🎯", label: "Match de vagas" },
                  { icon: "💬", label: "Chat inteligente" },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-700/40 rounded-lg p-3 text-center">
                    <div className="text-xl mb-1">{item.icon}</div>
                    <p className="text-slate-400 text-xs">{item.label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Loading state */
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                <div className="absolute inset-3 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>

              {fileName && (
                <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-full">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-slate-300 text-sm truncate max-w-[200px]">{fileName}</span>
                </div>
              )}

              <div className="text-center">
                <p className="text-white font-medium">{stepLabels[step]}</p>
                <p className="text-slate-500 text-xs mt-1">Isso pode levar alguns segundos...</p>
              </div>

              {/* Steps progress */}
              <div className="w-full space-y-2">
                {[
                  { key: "creating_bot", label: isReturningUser ? "Atualizando assistente" : "Criando assistente" },
                  { key: "uploading", label: "Enviando currículo" },
                  { key: "creating_session", label: "Iniciando sessão" },
                  { key: "extracting", label: "Analisando currículo" },
                  { key: "building_query", label: "Montando query de busca" },
                  { key: "searching", label: "Buscando vagas na web" },
                  { key: "done", label: "Pronto!" },
                ].map((s, i) => {
                  const steps = ["creating_bot", "uploading", "creating_session", "extracting", "building_query", "searching", "done"];
                  const currentIdx = steps.indexOf(step);
                  const thisIdx = steps.indexOf(s.key);
                  const isDone = thisIdx < currentIdx || step === "done";
                  const isActive = s.key === step;

                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isDone ? "bg-green-500" : isActive ? "bg-purple-500 animate-pulse" : "bg-slate-700"
                      }`}>
                        {isDone ? (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-white text-xs font-bold">{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-sm transition-colors ${
                        isDone ? "text-green-400" : isActive ? "text-white" : "text-slate-600"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Seus dados são processados com segurança e privacidade
        </p>
      </div>
    </div>
  );
}
