"use client";

import { useState, useMemo, useEffect } from "react";
import { JobVacancy } from "../actions/vacancy";

interface CandidateProfile {
  name: string;
  seniority: string;
  initial: string;
}

interface VacancyDashboardProps {
  vacancies: JobVacancy[];
  loading?: boolean;
}

type FilterType = "all" | "high" | "remote" | string;

export default function VacancyDashboard({ vacancies, loading = false }: VacancyDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      // Tenta carregar do cache primeiro
      const cached = localStorage.getItem("job_candidate_identity");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setProfile({ ...parsed, initial: (parsed.name || "C").charAt(0).toUpperCase() });
          return;
        } catch { /* ignora */ }
      }

      // Chama /api/openai para extrair nome e senioridade do resumeInfo
      const resumeInfo = localStorage.getItem("job_resume_info");
      if (!resumeInfo || resumeInfo.trim().length < 30) return;

      const prompt = `Com base no texto abaixo, extraia o nome completo e o nível de senioridade do candidato.

Responda SOMENTE neste formato JSON (sem markdown, sem explicações):
{"name":"Nome Completo","seniority":"Sênior"}

Níveis válidos para seniority: Estagiário, Júnior, Pleno, Sênior, Especialista, Gerente, Diretor.

TEXTO DO CURRÍCULO:
${resumeInfo.slice(0, 3000)}`;

      try {
        const res = await fetch("/api/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, maxTokens: 60 }),
        });

        const data = await res.json();
        const match = data.text?.match(/\{[\s\S]*\}/);

        if (match) {
          const parsed = JSON.parse(match[0]);
          const identity = {
            name: parsed.name || "Candidato",
            seniority: parsed.seniority || "",
          };
          setProfile({ ...identity, initial: identity.name.charAt(0).toUpperCase() });
          localStorage.setItem("job_candidate_identity", JSON.stringify(identity));
        }
      } catch (err) {
        console.error("[VacancyDashboard] erro ao extrair identidade:", err);
      }
    };

    loadProfile();
  }, []);

  // Áreas únicas para filtros dinâmicos
  const areas = useMemo(() => {
    const set = new Set<string>();
    vacancies.forEach((v) => { if (v.area) set.add(v.area); });
    return Array.from(set);
  }, [vacancies]);

  const filtered = useMemo(() => {
    return vacancies.filter((v) => {
      const matchFilter =
        activeFilter === "all" ||
        (activeFilter === "high" && v.match >= 85) ||
        (activeFilter === "remote" && v.remote) ||
        v.area === activeFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        v.title.toLowerCase().includes(q) ||
        v.company.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [vacancies, activeFilter, search]);

  const stats = useMemo(() => {
    const total = vacancies.length;
    const high = vacancies.filter((v) => v.match >= 85).length;
    const avg = total > 0 ? Math.round(vacancies.reduce((s, v) => s + v.match, 0) / total) : 0;
    const remote = vacancies.filter((v) => v.remote).length;
    return { total, high, avg, remote };
  }, [vacancies]);

  // Tags mais demandadas
  const topTags = useMemo(() => {
    const count: Record<string, number> = {};
    vacancies.forEach((v) => v.tags.forEach((t) => { count[t] = (count[t] || 0) + 1; }));
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [vacancies]);

  function getMatchColor(m: number) {
    if (m >= 85) return "#22a06b";
    if (m >= 75) return "#e8a020";
    return "#d94f3d";
  }

  function getMatchLabel(m: number) {
    if (m >= 85) return "🟢 Alta compatibilidade";
    if (m >= 75) return "🟡 Compatibilidade moderada";
    return "🔴 Compatibilidade baixa";
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-slate-900">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
          <div className="absolute inset-3 rounded-full bg-purple-500/10 flex items-center justify-center text-2xl">
            🔍
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">Nossa IA está buscando as melhores vagas</p>
          <p className="text-slate-400 text-xs mt-1">Analisando seu perfil e compatibilidade...</p>
          <p className="text-slate-500 text-xs mt-0.5">Isso pode levar alguns minutos</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (vacancies.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-900">
        <span className="text-4xl">📭</span>
        <p className="text-white font-semibold">Nenhuma vaga encontrada ainda</p>
        <p className="text-slate-400 text-sm">Faça o upload do seu currículo para começar</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-10">

        {/* Card de Perfil do Candidato */}
        {profile && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5 mb-6 flex gap-4 items-center">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg shadow-purple-900/40">
              {profile.initial}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-white font-bold text-base">{profile.name}</h2>
                {profile.seniority && (
                  <span className="bg-purple-600/30 text-purple-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-purple-500/30">
                    {profile.seniority}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { value: stats.total, label: "Vagas Encontradas", color: "text-purple-400" },
            { value: stats.high, label: "Match Alto (≥85%)", color: "text-green-400" },
            { value: `${stats.avg}%`, label: "Match Médio", color: "text-blue-400" },
            { value: stats.remote, label: "Vagas Remotas", color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700/50">
              <p className={`text-2xl font-extrabold leading-none ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Top Tags */}
        {topTags.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-700/50">
            <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">🏷️ Competências mais demandadas</p>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 bg-slate-700 text-slate-200 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {tag}
                  <span className="bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-5 items-center">
          {[
            { key: "all", label: "Todas" },
            { key: "high", label: "Match Alto (≥85%)" },
            { key: "remote", label: "🏠 Remoto" },
            ...areas.map((a) => ({ key: a, label: `📂 ${a.charAt(0).toUpperCase() + a.slice(1)}` })),
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                activeFilter === f.key
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-slate-800 border-slate-600 text-slate-300 hover:border-purple-500 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔎 Buscar vaga ou empresa..."
            className="ml-auto bg-slate-800 border border-slate-600 rounded-full px-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-52"
          />
        </div>

        {/* Grid de vagas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="bg-slate-800 rounded-xl border border-slate-700/50 hover:border-purple-500/60 hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
            >
              {/* Card header */}
              <div className="p-4 border-b border-slate-700/50 flex gap-3 items-start">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${v.color || "#6366f1"}, ${v.color || "#6366f1"}99)` }}
                >
                  {v.icon || v.company.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{v.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{v.company}</p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 flex-1">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="inline-flex items-center gap-1 bg-slate-700/60 text-slate-300 rounded-full px-2.5 py-0.5 text-xs">
                    📍 {v.location}
                  </span>
                  {v.salary && (
                    <span className="inline-flex items-center gap-1 bg-green-900/40 text-green-400 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      💰 {v.salary}
                    </span>
                  )}
                </div>

                {/* Match bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 text-xs">Compatibilidade</span>
                    <span className="font-extrabold text-sm" style={{ color: getMatchColor(v.match) }}>
                      {v.match}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${v.match}%`,
                        background: `linear-gradient(90deg, ${getMatchColor(v.match)}, ${getMatchColor(v.match)}bb)`,
                      }}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {v.tags.slice(0, 4).map((t) => (
                    <span key={t} className="bg-slate-700/60 text-slate-300 rounded-full px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card footer */}
              <div className="p-3 border-t border-slate-700/50 flex gap-2">
                <button
                  onClick={() => setSelectedVacancy(v)}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  Ver Análise Completa
                </button>
                {v.url && (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 border border-slate-600 hover:border-purple-500 text-slate-400 hover:text-purple-400 text-xs rounded-lg transition-colors"
                  >
                    🔗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">🔍</p>
            <p className="text-sm mt-2">Nenhuma vaga encontrada com esse filtro</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedVacancy && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedVacancy(null); }}
        >
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto border border-slate-700 shadow-2xl">
            {/* Modal header */}
            <div className="p-6 border-b border-slate-700 flex gap-4 items-start sticky top-0 bg-slate-800 z-10">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${selectedVacancy.color || "#6366f1"}, ${selectedVacancy.color || "#6366f1"}99)`,
                }}
              >
                {selectedVacancy.icon || selectedVacancy.company.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base leading-snug">{selectedVacancy.title}</p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {selectedVacancy.company} · {selectedVacancy.location}
                </p>
              </div>
              <button
                onClick={() => setSelectedVacancy(null)}
                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Match destaque */}
              <div className="flex items-center gap-4 bg-slate-700/50 rounded-xl p-4">
                <span className="text-4xl font-black" style={{ color: getMatchColor(selectedVacancy.match) }}>
                  {selectedVacancy.match}%
                </span>
                <div>
                  <p className="text-white font-semibold text-sm">Match de Compatibilidade</p>
                  <p className="text-slate-400 text-xs mt-0.5">{getMatchLabel(selectedVacancy.match)}</p>
                </div>
              </div>

              {/* Detalhes */}
              <div>
                <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">📋 Detalhes da Vaga</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-slate-700 text-slate-300 rounded-full px-3 py-1 text-xs">
                    📍 {selectedVacancy.location}
                  </span>
                  {selectedVacancy.salary ? (
                    <span className="bg-green-900/40 text-green-400 rounded-full px-3 py-1 text-xs font-semibold">
                      💰 {selectedVacancy.salary}
                    </span>
                  ) : (
                    <span className="bg-slate-700 text-slate-400 rounded-full px-3 py-1 text-xs">
                      💰 Salário não informado
                    </span>
                  )}
                  {selectedVacancy.remote && !selectedVacancy.location?.toLowerCase().includes("remoto") ? (
                    <span className="bg-blue-900/40 text-blue-400 rounded-full px-3 py-1 text-xs">🏠 Remoto</span>
                  ) : !selectedVacancy.remote ? (
                    <span className="bg-slate-700 text-slate-400 rounded-full px-3 py-1 text-xs">🏢 Presencial</span>
                  ) : null}
                </div>
                {selectedVacancy.content ? (
                  <div
                    className="vacancy-content text-slate-300 text-sm leading-relaxed bg-slate-700/30 rounded-xl p-4"
                    dangerouslySetInnerHTML={{ __html: selectedVacancy.content }}
                    style={{
                      // Estilos inline para garantir formatação do HTML mesmo sem Tailwind prose
                    }}
                  />
                ) : (
                  <div className="bg-slate-700/30 rounded-xl p-4 text-slate-500 text-sm italic">
                    Conteúdo da vaga não disponível. Acesse a vaga original para mais detalhes.
                  </div>
                )}
              </div>

              {/* Análise */}
              {selectedVacancy.analyze && (() => {
                const lines = selectedVacancy.analyze!
                  .split(/\n/)
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0);

                const positives = lines.filter((l) => l.startsWith("✅"));
                const warnings  = lines.filter((l) => l.startsWith("⚠️"));
                const tips      = lines.filter((l) => l.startsWith("💡"));
                const negatives = lines.filter((l) => l.startsWith("❌") || l.startsWith("🔴"));
                const probLine  = lines.find((l) => l.startsWith("📊"));

                const renderItems = (items: string[], color: string, bg: string, border: string) =>
                  items.map((item, i) => (
                    <div key={i} className={`flex gap-3 px-3 py-2.5 rounded-lg ${bg} border ${border}`}>
                      <span className="text-base shrink-0 leading-snug mt-0.5">
                        {item.match(/^(✅|⚠️|💡|❌|🔴)/)?.[0]}
                      </span>
                      <span className={`text-sm leading-relaxed ${color}`}>
                        {item.replace(/^(✅|⚠️|💡|❌|🔴)\s*/, "").trim()}
                      </span>
                    </div>
                  ));

                return (
                  <div>
                    <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-3">🎯 Análise de Compatibilidade</p>
                    <div className="space-y-4">

                      {/* Pontos Fortes */}
                      {positives.length > 0 && (
                        <div className="bg-green-950/30 rounded-xl border border-green-800/30 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-green-800/30 bg-green-900/20">
                            <span className="text-sm">✅</span>
                            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Pontos Fortes</span>
                            <span className="ml-auto bg-green-800/50 text-green-300 text-xs font-bold px-2 py-0.5 rounded-full">{positives.length}</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {renderItems(positives, "text-green-300", "bg-green-900/20", "border-green-800/30")}
                          </div>
                        </div>
                      )}

                      {/* Lacunas */}
                      {warnings.length > 0 && (
                        <div className="bg-yellow-950/30 rounded-xl border border-yellow-800/30 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-yellow-800/30 bg-yellow-900/20">
                            <span className="text-sm">⚠️</span>
                            <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Lacunas / Atenção</span>
                            <span className="ml-auto bg-yellow-800/50 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full">{warnings.length}</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {renderItems(warnings, "text-yellow-300", "bg-yellow-900/20", "border-yellow-800/30")}
                          </div>
                        </div>
                      )}

                      {/* Pontos Negativos */}
                      {negatives.length > 0 && (
                        <div className="bg-red-950/30 rounded-xl border border-red-800/30 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-800/30 bg-red-900/20">
                            <span className="text-sm">❌</span>
                            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Requisitos Não Atendidos</span>
                            <span className="ml-auto bg-red-800/50 text-red-300 text-xs font-bold px-2 py-0.5 rounded-full">{negatives.length}</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {renderItems(negatives, "text-red-300", "bg-red-900/20", "border-red-800/30")}
                          </div>
                        </div>
                      )}

                      {/* Dicas */}
                      {tips.length > 0 && (
                        <div className="bg-blue-950/30 rounded-xl border border-blue-800/30 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-blue-800/30 bg-blue-900/20">
                            <span className="text-sm">💡</span>
                            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Dicas para se Candidatar</span>
                            <span className="ml-auto bg-blue-800/50 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">{tips.length}</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {renderItems(tips, "text-blue-300", "bg-blue-900/20", "border-blue-800/30")}
                          </div>
                        </div>
                      )}

                      {/* Probabilidade de Aprovação */}
                      {probLine && (() => {
                        const percentMatch = probLine.match(/(\d+)%/);
                        const percent = percentMatch ? parseInt(percentMatch[1]) : null;
                        const justification = probLine.replace(/^📊\s*Probabilidade de aprovação:\s*/i, "").trim();
                        const probColor = percent && percent >= 75 ? "#22a06b" : percent && percent >= 55 ? "#e8a020" : "#d94f3d";
                        return (
                          <div className="rounded-xl border border-slate-600/50 bg-slate-700/30 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-600/50 bg-slate-700/40">
                              <span className="text-sm">📊</span>
                              <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">Probabilidade de Aprovação</span>
                            </div>
                            <div className="p-4">
                              {percent !== null && (
                                <div className="flex items-center gap-4 mb-3">
                                  <span className="text-3xl font-black" style={{ color: probColor }}>{percent}%</span>
                                  <div className="flex-1 h-3 bg-slate-600 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-700"
                                      style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${probColor}, ${probColor}bb)` }}
                                    />
                                  </div>
                                </div>
                              )}
                              <p className="text-slate-300 text-sm leading-relaxed">{justification}</p>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                );
              })()}

              {/* Tags */}
              {selectedVacancy.tags.length > 0 && (
                <div>
                  <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">🏷️ Competências Relevantes</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVacancy.tags.map((t) => (
                      <span key={t} className="bg-slate-700 text-slate-300 rounded-full px-3 py-1 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão vaga */}
              {selectedVacancy.url && (
                <a
                  href={selectedVacancy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  🔗 Acessar Vaga Original
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estilos para conteúdo HTML da vaga */}
      <style>{`
        .vacancy-content b, .vacancy-content strong {
          color: #c4b5fd;
          font-weight: 600;
          display: block;
          margin-top: 10px;
          margin-bottom: 4px;
        }
        .vacancy-content ul { list-style: disc; padding-left: 18px; margin: 4px 0 10px; }
        .vacancy-content li { margin-bottom: 3px; color: #cbd5e1; }
        .vacancy-content p { margin-bottom: 8px; }
      `}</style>
    </div>
  );
}
