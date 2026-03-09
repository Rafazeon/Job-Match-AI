"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { streamMessage } from "../actions/document";
import { clearChatHistory, ChatMessage } from "../actions/chat";
import VacancyDashboard from "./VacancyDashboard";
import { JobVacancy } from "../actions/vacancy";

interface ChatInterfaceProps {
  sessionId: string;
  botId: string;
  fileName: string;
  vacancies: JobVacancy[];
  loadingMindMap?: boolean;
  onVacanciesReady?: (vacancies: JobVacancy[]) => void;
  onReset: () => void;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  createdAt: string;
  isStreaming?: boolean;
}

type ActiveTab = "chat" | "mindmap";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  sender: "bot",
  text: "Olá! 👋 Seu currículo está sendo analisado — em breve as vagas compatíveis aparecerão no **Mapa de Vagas**!\n\nEnquanto isso, posso te ajudar com:\n• Dúvidas sobre seu currículo\n• Dicas para se preparar para entrevistas\n• Informações sobre salários de mercado\n• Orientações para melhorar seu perfil\n\nComo posso te ajudar?",
  createdAt: new Date().toISOString(),
};

export default function ChatInterface({
  sessionId,
  botId,
  fileName,
  vacancies: initialVacancies,
  loadingMindMap: initialLoadingMindMap = false,
  onVacanciesReady,
  onReset,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [vacancies, setVacancies] = useState<JobVacancy[]>(initialVacancies);
  const [loadingMindMap, setLoadingMindMap] = useState(initialLoadingMindMap);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Escuta o evento disparado pelo UploadResume quando o Manus finaliza
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<JobVacancy[]>).detail;
      setVacancies(detail);
      setLoadingMindMap(false);
      onVacanciesReady?.(detail);
      if (detail.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-vacancies-${Date.now()}`,
            sender: "bot",
            text: `🎉 Encontrei **${detail.length} vagas compatíveis** com seu perfil! Acesse a aba **Mapa de Vagas** para visualizá-las e clique em qualquer vaga para ver a análise detalhada.`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    };
    window.addEventListener("vacancies_ready", handler);
    return () => window.removeEventListener("vacancies_ready", handler);
  }, [onVacanciesReady]);

  // Sincroniza se as props mudarem externamente
  useEffect(() => {
    setVacancies(initialVacancies);
  }, [initialVacancies]);

  useEffect(() => {
    setLoadingMindMap(initialLoadingMindMap);
  }, [initialLoadingMindMap]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: question,
      createdAt: new Date().toISOString(),
    };

    const botMsgId = `bot-${Date.now()}`;
    const botMsg: Message = {
      id: botMsgId,
      sender: "bot",
      text: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    setIsLoading(true);

    await streamMessage(
      { sessionId, question, language: "pt-BR", saveHistory: true },
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, text: m.text + chunk } : m
          )
        );
      },
      () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, isStreaming: false } : m
          )
        );
        setIsLoading(false);
      },
      (error) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? { ...m, text: `❌ Erro: ${error}`, isStreaming: false }
              : m
          )
        );
        setIsLoading(false);
      }
    );
  }, [input, isLoading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = async () => {
    try {
      await clearChatHistory(sessionId);
      setMessages([WELCOME_MESSAGE]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Erro ao limpar histórico:", err);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const highMatchCount = vacancies.filter((v) => v.match >= 80).length;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">Job Match AI</h1>
            <p className="text-slate-400 text-xs truncate max-w-[180px]">📄 {fileName}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="text-center">
            <p className="text-purple-400 font-bold text-lg leading-none">{vacancies.length}</p>
            <p className="text-slate-500 text-xs">vagas</p>
          </div>
          <div className="text-center">
            <p className="text-green-400 font-bold text-lg leading-none">{highMatchCount}</p>
            <p className="text-slate-500 text-xs">alta compat.</p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors bg-slate-700/50 hover:bg-slate-700 px-3 py-1.5 rounded-lg"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Novo currículo
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 px-4">
        <div className="flex gap-1">
          {[
            { key: "chat" as ActiveTab, label: "💬 Chat com IA", icon: null },
            {
            key: "mindmap" as ActiveTab,
            label: loadingMindMap ? "✨ Analisando seu perfil..." : `🔍 Vagas${vacancies.length > 0 ? ` (${vacancies.length})` : ""}`,
            icon: null,
          },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "chat" ? (
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                    msg.sender === "user"
                      ? "bg-purple-600"
                      : "bg-slate-700 border border-slate-600"
                  }`}>
                    {msg.sender === "user" ? "👤" : "🤖"}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] ${msg.sender === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-purple-600 text-white rounded-tr-sm"
                        : "bg-slate-800 text-slate-100 border border-slate-700/50 rounded-tl-sm"
                    }`}>
                      {msg.text}
                      {msg.isStreaming && (
                        <span className="inline-flex gap-0.5 ml-1">
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 text-xs px-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-slate-700/50 bg-slate-800/50 p-4">
              {/* Clear chat */}
              <div className="flex justify-end mb-2">
                {showClearConfirm ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Limpar histórico?</span>
                    <button
                      onClick={handleClearChat}
                      className="text-red-400 hover:text-red-300 font-medium"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-slate-400 hover:text-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-slate-500 hover:text-slate-400 text-xs flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Limpar chat
                  </button>
                )}
              </div>

              <div className="flex gap-3 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre as vagas, seu currículo, dicas..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 transition-colors overflow-hidden"
                  style={{ maxHeight: "120px" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 120) + "px";
                    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="w-11 h-11 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                >
                  {isLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-slate-600 text-xs mt-2 text-center">
                Enter para enviar • Shift+Enter para nova linha
              </p>
            </div>
          </div>
        ) : (
          /* Vacancy Dashboard Tab */
          <VacancyDashboard vacancies={vacancies} loading={loadingMindMap} />
        )}
      </div>
    </div>
  );
}
