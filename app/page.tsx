"use client";

import { useState, useEffect } from "react";
import UploadResume from "./components/UploadResume";
import dynamic from "next/dynamic";
import { JobVacancy } from "./actions/vacancy";

const ChatInterface = dynamic(() => import("./components/ChatInterface"), {
  ssr: false,
});

interface SessionData {
  botId: string;
  sessionId: string;
  clientId: string;
  fileName: string;
  vacancies: JobVacancy[];
  loadingMindMap?: boolean;
  vectorStoreId: string;
}

export default function Home() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const botId = localStorage.getItem("job_bot_id");
    const sessionId = localStorage.getItem("job_session_id");
    const clientId = localStorage.getItem("job_client_id");
    const fileName = localStorage.getItem("job_file_name");
    const vectorStoreId = localStorage.getItem("job_vector_store_id");
    const vacanciesRaw = localStorage.getItem("job_vacancies");

    if (botId && sessionId && clientId && fileName && vectorStoreId) {
      let vacancies: JobVacancy[] = [];
      try {
        vacancies = vacanciesRaw ? JSON.parse(vacanciesRaw) : [];
      } catch {
        vacancies = [];
      }
      setSessionData({ botId, sessionId, clientId, fileName, vacancies, vectorStoreId });
    }
  }, []);

  const handleUploadComplete = (data: SessionData) => {
    localStorage.setItem("job_bot_id", data.botId);
    localStorage.setItem("job_session_id", data.sessionId);
    localStorage.setItem("job_client_id", data.clientId);
    localStorage.setItem("job_file_name", data.fileName);
    localStorage.setItem("job_vector_store_id", data.vectorStoreId);
    if (data.vacancies.length > 0) {
      localStorage.setItem("job_vacancies", JSON.stringify(data.vacancies));
    }
    setSessionData(data);
  };

  const handleVacanciesReady = (vacancies: JobVacancy[]) => {
    localStorage.setItem("job_vacancies", JSON.stringify(vacancies));
    setSessionData((prev) =>
      prev ? { ...prev, vacancies, loadingMindMap: false } : prev
    );
  };

  const handleReset = () => {
    localStorage.removeItem("job_session_id");
    localStorage.removeItem("job_file_name");
    localStorage.removeItem("job_vacancies");
    localStorage.removeItem("job_resume_info");
    localStorage.removeItem("job_candidate_identity");
    setSessionData(null);
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionData) {
    return (
      <ChatInterface
        sessionId={sessionData.sessionId}
        botId={sessionData.botId}
        fileName={sessionData.fileName}
        vacancies={sessionData.vacancies}
        loadingMindMap={sessionData.loadingMindMap ?? false}
        vectorStoreId={sessionData.vectorStoreId}
        onVacanciesReady={handleVacanciesReady}
        onReset={handleReset}
      />
    );
  }

  return <UploadResume onComplete={handleUploadComplete} />;
}
