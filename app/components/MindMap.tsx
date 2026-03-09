"use client";

import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { JobVacancy } from "../actions/vacancy";

export type { JobVacancy };

interface MindMapProps {
  vacancies: JobVacancy[];
  candidateName?: string;
}

// ─── Nó central ────────────────────────────────────────────────────────────
function CenterNode({ data }: NodeProps) {
  return (
    <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-2xl px-5 py-3 shadow-xl border border-purple-400/30 text-center min-w-[140px]">
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="text-2xl mb-1">👤</div>
      <div className="font-bold text-sm">{data.label}</div>
      <div className="text-purple-200 text-xs mt-0.5">Seu perfil</div>
    </div>
  );
}

// ─── Nó de vaga ────────────────────────────────────────────────────────────
function VacancyNode({ data }: NodeProps) {
  const matchColor =
    data.match >= 80
      ? "from-green-600 to-green-800 border-green-400/30"
      : data.match >= 60
      ? "from-blue-600 to-blue-800 border-blue-400/30"
      : "from-slate-600 to-slate-800 border-slate-400/30";

  return (
    <div
      className={`bg-gradient-to-br ${matchColor} text-white rounded-xl px-4 py-3 shadow-lg border min-w-[180px] max-w-[220px] cursor-pointer hover:scale-105 transition-transform`}
      onClick={() => data.onSelect?.()}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Cabeçalho: título + match */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-xs leading-tight line-clamp-2">{data.title}</span>
        <span className="text-xs font-bold bg-white/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
          {data.match}%
        </span>
      </div>

      {/* Empresa + localização */}
      {data.company && (
        <div className="text-white/80 text-xs font-medium truncate">{data.company}</div>
      )}
      {data.location && (
        <div className="text-white/60 text-xs truncate">{data.location}</div>
      )}

      {/* Salário */}
      {data.salary && (
        <div className="text-white/90 text-xs mt-1 font-semibold">{data.salary}</div>
      )}

      {/* Summary */}
      {data.summary && (
        <div className="text-white/70 text-xs mt-1.5 italic line-clamp-2 border-t border-white/10 pt-1.5">
          {data.summary}
        </div>
      )}

      {/* Tags */}
      {data.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="text-xs bg-white/10 rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
          {data.tags.length > 3 && (
            <span className="text-xs text-white/40">+{data.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="text-white/40 text-xs mt-2 text-right">clique para detalhes →</div>
    </div>
  );
}

const nodeTypes = {
  center: CenterNode,
  vacancy: VacancyNode,
};

// ─── Construção do grafo ────────────────────────────────────────────────────
function buildGraph(
  vacancies: JobVacancy[],
  candidateName: string,
  onSelect: (v: JobVacancy) => void
) {
  const nodes: Node[] = [
    {
      id: "center",
      type: "center",
      position: { x: 0, y: 0 },
      data: { label: candidateName || "Candidato" },
    },
  ];

  const edges: Edge[] = [];
  const count = vacancies.length;
  const radius = Math.max(320, count * 50);

  vacancies.forEach((vacancy, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    nodes.push({
      id: vacancy.id,
      type: "vacancy",
      position: { x, y },
      data: {
        title: vacancy.title,
        company: vacancy.company,
        location: vacancy.location,
        salary: vacancy.salary,
        match: vacancy.match,
        tags: vacancy.tags,
        url: vacancy.url,
        summary: vacancy.summary,
        onSelect: () => onSelect(vacancy),
      },
    });

    const matchColor =
      vacancy.match >= 80 ? "#22c55e" : vacancy.match >= 60 ? "#3b82f6" : "#64748b";

    edges.push({
      id: `e-center-${vacancy.id}`,
      source: "center",
      target: vacancy.id,
      style: { stroke: matchColor, strokeWidth: 2, opacity: 0.6 },
      animated: vacancy.match >= 80,
    });
  });

  return { nodes, edges };
}

// ─── Painel de detalhes ─────────────────────────────────────────────────────
function DetailPanel({
  vacancy,
  onClose,
}: {
  vacancy: JobVacancy;
  onClose: () => void;
}) {
  const matchColor =
    vacancy.match >= 80
      ? "text-green-400 bg-green-400/10 border-green-400/30"
      : vacancy.match >= 60
      ? "text-blue-400 bg-blue-400/10 border-blue-400/30"
      : "text-slate-400 bg-slate-400/10 border-slate-400/30";

  return (
    <div className="absolute top-0 right-0 h-full w-[360px] bg-slate-900/95 backdrop-blur-md border-l border-slate-700/60 z-20 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-700/60">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-bold text-white text-sm leading-tight">{vacancy.title}</h3>
          {vacancy.company && (
            <p className="text-slate-300 text-xs mt-0.5">{vacancy.company}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors flex-shrink-0 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Match + localização + salário */}
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded-full border font-bold ${matchColor}`}>
            {vacancy.match}% compatível
          </span>
          {vacancy.location && (
            <span className="px-2 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/40">
              📍 {vacancy.location}
            </span>
          )}
          {vacancy.salary && (
            <span className="px-2 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/40">
              💰 {vacancy.salary}
            </span>
          )}
        </div>

        {/* Summary */}
        {vacancy.summary && (
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wide text-[10px]">Resumo</p>
            <p className="text-slate-200 leading-relaxed">{vacancy.summary}</p>
          </div>
        )}

        {/* Tags */}
        {vacancy.tags && vacancy.tags.length > 0 && (
          <div>
            <p className="text-slate-400 font-semibold mb-2 uppercase tracking-wide text-[10px]">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {vacancy.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-slate-700/60 text-slate-200 border border-slate-600/40 rounded px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Análise */}
        {vacancy.analyze && (
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wide text-[10px]">
              🎯 Análise de compatibilidade
            </p>
            <p className="text-slate-200 leading-relaxed whitespace-pre-line">{vacancy.analyze}</p>
          </div>
        )}

        {/* Descrição completa */}
        {vacancy.description && (
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wide text-[10px]">
              📋 Detalhes da vaga
            </p>
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">{vacancy.description}</p>
          </div>
        )}
      </div>

      {/* Footer — botão de candidatura */}
      {vacancy.url && (
        <div className="p-4 border-t border-slate-700/60">
          <a
            href={vacancy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-lg"
          >
            Ver vaga completa →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Dados mock ─────────────────────────────────────────────────────────────
const MOCK_VACANCIES: JobVacancy[] = [
  {
    id: "v1",
    title: "Desenvolvedor Frontend",
    company: "TechCorp",
    location: "São Paulo, SP",
    salary: "R$ 8.000 - 12.000",
    match: 92,
    tags: ["React", "TypeScript"],
    url: "#",
    summary: "Dev Frontend Pleno · TechCorp · Remoto · R$ 8-12k",
  },
  {
    id: "v2",
    title: "Engenheiro Full Stack",
    company: "StartupXYZ",
    location: "Remoto",
    salary: "R$ 10.000 - 15.000",
    match: 85,
    tags: ["Node.js", "React"],
    url: "#",
    summary: "Full Stack Pleno · StartupXYZ · Remoto · R$ 10-15k",
  },
  {
    id: "v3",
    title: "Dev React Senior",
    company: "BigBank",
    location: "Rio de Janeiro, RJ",
    salary: "R$ 12.000 - 18.000",
    match: 88,
    tags: ["React", "AWS"],
    url: "#",
    summary: "Dev React Sênior · BigBank · Híbrido RJ · R$ 12-18k",
  },
  {
    id: "v4",
    title: "Tech Lead Frontend",
    company: "Fintech SA",
    location: "Híbrido - SP",
    salary: "R$ 15.000 - 22.000",
    match: 75,
    tags: ["Liderança", "React"],
    url: "#",
    summary: "Tech Lead Frontend · Fintech SA · Híbrido SP · R$ 15-22k",
  },
  {
    id: "v5",
    title: "Desenvolvedor Next.js",
    company: "E-commerce Plus",
    location: "Remoto",
    salary: "R$ 7.000 - 11.000",
    match: 90,
    tags: ["Next.js", "TypeScript"],
    url: "#",
    summary: "Dev Next.js Pleno · E-commerce Plus · Remoto · R$ 7-11k",
  },
  {
    id: "v6",
    title: "Frontend Engineer",
    company: "Global Tech",
    location: "Remoto Internacional",
    salary: "USD 3.000 - 5.000",
    match: 70,
    tags: ["Vue.js", "React"],
    url: "#",
    summary: "Frontend Engineer · Global Tech · Remoto Internacional · USD 3-5k",
  },
];

// ─── Componente principal ───────────────────────────────────────────────────
export default function MindMap({ vacancies, candidateName }: MindMapProps) {
  const [selected, setSelected] = useState<JobVacancy | null>(null);

  const displayVacancies = vacancies.length > 0 ? vacancies : MOCK_VACANCIES;

  const { nodes: initialNodes, edges: initialEdges } = buildGraph(
    displayVacancies,
    candidateName || "Candidato",
    setSelected
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildGraph(
      displayVacancies,
      candidateName || "Candidato",
      setSelected
    );
    setNodes(newNodes);
    setEdges(newEdges);
    setSelected(null);
  }, [vacancies, candidateName]);

  const isMock = vacancies.length === 0;

  return (
    <div className="relative w-full h-full">
      {isMock && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
          ✨ Prévia — vagas reais aparecerão após análise do currículo
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-slate-900"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#334155" gap={20} size={1} />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-xl" />
        <MiniMap
          className="!bg-slate-800 !border-slate-700 !rounded-xl"
          nodeColor={(n) => {
            if (n.type === "center") return "#9333ea";
            const match = n.data?.match || 0;
            return match >= 80 ? "#22c55e" : match >= 60 ? "#3b82f6" : "#64748b";
          }}
        />
      </ReactFlow>

      {/* Legenda */}
      <div className="absolute bottom-14 left-3 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 text-xs space-y-1.5 z-10">
        <p className="text-slate-400 font-medium mb-2">Compatibilidade</p>
        {[
          { color: "bg-green-500", label: "Alta (≥80%)" },
          { color: "bg-blue-500", label: "Média (60-79%)" },
          { color: "bg-slate-500", label: "Baixa (<60%)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Painel de detalhes */}
      {selected && (
        <DetailPanel vacancy={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
