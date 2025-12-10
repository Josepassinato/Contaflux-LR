
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  Connection,
  Node,
  Handle,
  Position,
  MarkerType,
  MiniMap,
  BackgroundVariant
} from 'reactflow';
import { FiscalDocument, Company, ValidationIssue } from '../types';
import { Bot, FileText, Activity, AlertTriangle, CheckCircle2, Search, Zap, X, BrainCircuit, ShieldCheck, LogOut } from 'lucide-react';
import { validatorService } from '../services/validatorService';

// --- CUSTOM NODES (NEON / SCI-FI STYLE) ---

const DocNode = ({ data }: { data: { doc: FiscalDocument; isAuditorMode: boolean; validationStatus?: 'ok' | 'error' | 'warning' } }) => {
  let statusColor = 'border-slate-700 bg-slate-900/80 hover:border-blue-500';
  let glowEffect = '';

  if (data.isAuditorMode) {
     if (data.validationStatus === 'error') {
         statusColor = 'border-red-500/80 bg-red-900/30 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
     } else if (data.validationStatus === 'warning') {
         statusColor = 'border-amber-500/80 bg-amber-900/30 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
     } else {
         statusColor = 'border-emerald-500/80 bg-emerald-900/30 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
     }
  } else {
      if (data.doc.operation_type === 'exit') {
          glowEffect = 'hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:border-emerald-500';
      } else {
          glowEffect = 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-500';
      }
  }

  return (
    <div className={`p-4 rounded-xl border-2 backdrop-blur-xl w-64 transition-all duration-300 ${statusColor} ${glowEffect} group relative text-white`}>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-white border-2 border-blue-500 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
      
      <div className={`absolute -top-3 left-4 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${
          data.doc.operation_type === 'exit' 
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
          : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      }`}>
          {data.doc.operation_type === 'exit' ? 'Receita' : 'Despesa'}
      </div>

      <div className="flex justify-between items-start mb-3 mt-1">
        <div className={`p-2 rounded-lg ${data.doc.operation_type === 'exit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
          <FileText size={20} />
        </div>
        {data.isAuditorMode && (
             <div className="animate-in zoom-in duration-300">
                {data.validationStatus === 'error' && <AlertTriangle size={20} className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,1)]" />}
                {data.validationStatus === 'warning' && <AlertTriangle size={20} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,1)]" />}
                {data.validationStatus === 'ok' && <CheckCircle2 size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,1)]" />}
             </div>
        )}
      </div>
      
      <div className="mb-3 space-y-1">
        <p className="text-[10px] text-slate-400 font-mono truncate">{data.doc.access_key?.substring(0, 19)}...</p>
        <p className="font-bold text-slate-100 text-sm truncate leading-tight tracking-wide" title={data.doc.name}>{data.doc.name}</p>
      </div>
      
      <div className="flex justify-between items-center border-t border-slate-700/50 pt-2 mt-2">
        <span className="text-[10px] text-slate-400 uppercase">Total NFe</span>
        <span className="font-bold text-white text-sm tracking-tight drop-shadow-md">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(data.doc.amount)}
        </span>
      </div>
    </div>
  );
};

const BlockENode = ({ data }: { data: { debits: number; credits: number; balance: number } }) => {
  return (
    <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
        
        <div className="relative p-6 rounded-2xl border border-slate-600 bg-slate-900/95 backdrop-blur-2xl shadow-2xl w-80 text-white">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-white border-2 border-indigo-500" />
            
            <div className="flex items-center gap-4 mb-6 border-b border-slate-700/50 pb-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                <Activity size={28} />
                </div>
                <div>
                <h3 className="font-bold text-white leading-tight text-xl tracking-tight">Reator Fiscal</h3>
                <p className="text-[10px] text-indigo-300 font-medium tracking-widest uppercase">Bloco E - Live Sync</p>
                </div>
            </div>

            <div className="space-y-5">
                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-400 uppercase tracking-wider">Débitos (Saídas)</span>
                        <span className="font-mono text-emerald-400 font-bold shadow-black drop-shadow-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(data.debits)}
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-400 uppercase tracking-wider">Créditos (Entradas)</span>
                        <span className="font-mono text-blue-400 font-bold shadow-black drop-shadow-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(data.credits)}
                        </span>
                    </div>
                </div>

                <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-700 flex justify-between items-center mt-2 shadow-inner">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Final</span>
                    <span className="font-bold text-white text-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.balance)}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
};

const TitleNode = ({ data }: { data: { label: string } }) => {
    return (
        <div className="text-center pointer-events-none">
            <h2 className="text-2xl font-bold text-slate-500 tracking-widest uppercase">{data.label}</h2>
        </div>
    );
};


const nodeTypes = {
  docNode: DocNode,
  blockENode: BlockENode,
  titleNode: TitleNode
};

interface InteractiveMapProps {
  documents: FiscalDocument[];
  company: Company;
  onExit: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ documents, company, onExit }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isAuditorMode, setIsAuditorMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node<any> | null>(null);

  useEffect(() => {
    const exitDocs = documents.filter(d => d.operation_type === 'exit');
    const entryDocs = documents.filter(d => d.operation_type === 'entry');

    const exitNodes: Node[] = exitDocs.map((doc, index) => ({
      id: doc.id,
      type: 'docNode',
      position: { x: 100, y: 150 + index * 220 },
      data: { doc, isAuditorMode: false },
    }));

    const entryNodes: Node[] = entryDocs.map((doc, index) => ({
      id: doc.id,
      type: 'docNode',
      position: { x: 450, y: 150 + index * 220 },
      data: { doc, isAuditorMode: false },
    }));

    const blockENode: Node = {
      id: 'block-e',
      type: 'blockENode',
      position: { x: 850, y: 350 },
      data: { debits: 0, credits: 0, balance: 0 },
    };
    
    const titleNodes: Node[] = [
        { id: 'title-exit', type: 'titleNode', position: { x: 100, y: 50 }, data: { label: 'Receitas (Saídas)' } },
        { id: 'title-entry', type: 'titleNode', position: { x: 450, y: 50 }, data: { label: 'Despesas (Entradas)' } },
    ];

    setNodes([...titleNodes, ...exitNodes, ...entryNodes, blockENode]);
  }, [documents, setNodes]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep', style: { stroke: '#60a5fa', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' } }, eds)), [setEdges]);

  useEffect(() => {
    const connectedDocIds = edges.filter(e => e.target === 'block-e').map(e => e.source);
    let debits = 0;
    let credits = 0;

    documents.forEach(doc => {
        if (connectedDocIds.includes(doc.id)) {
            if (doc.operation_type === 'exit') debits += doc.total_icms; 
            else credits += doc.total_icms;
        }
    });
    const balance = Math.max(0, debits - credits);
    
    setNodes(nds => nds.map(node => node.id === 'block-e' ? { ...node, data: { ...node.data, debits, credits, balance } } : node));
  }, [edges, documents, setNodes]);

  useEffect(() => {
    const issues = validatorService.validateSped(documents);
    setNodes(nds => nds.map(node => {
        if (node.type === 'docNode') {
            const doc = node.data.doc as FiscalDocument;
            let status: 'ok' | 'warning' | 'error' = 'ok';
            const docIssues = issues.filter(i => i.details?.includes(doc.name) || i.details?.includes(doc.access_key || ''));

            if (docIssues.some(i => i.severity === 'error')) {
                status = 'error';
            } else if (docIssues.some(i => i.severity === 'warning')) {
                status = 'warning';
            }
            return { ...node, data: { ...node.data, isAuditorMode, validationStatus: status } };
        }
        return { ...node, data: { ...node.data, isAuditorMode } };
    }));
  }, [isAuditorMode, documents, setNodes]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.type === 'docNode') {
        setSelectedNode(node);
    }
  };

  const getIssuesForNode = (node: Node | null): ValidationIssue[] => {
    if (!node || node.type !== 'docNode') return [];
    const issues = validatorService.validateSped(documents);
    const doc = node.data.doc as FiscalDocument;
    return issues.filter(i => i.details?.includes(doc.name) || i.details?.includes(doc.access_key || ''));
  };

  const nodeIssues = useMemo(() => getIssuesForNode(selectedNode), [selectedNode, documents]);

  return (
    <div className="h-full w-full relative bg-slate-950 text-white overflow-hidden">
        <style>{`html, body { background-color: #020617 !important; overflow: hidden; } #root { height: 100vh; }`}</style>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950 to-slate-950 pointer-events-none"></div>

        {/* --- ANALYSIS SIDE PANEL --- */}
        <div className={`absolute top-0 left-0 h-full w-96 bg-slate-900/90 backdrop-blur-xl border-r border-slate-700 shadow-2xl z-20 transition-transform duration-500 ease-in-out
            ${selectedNode ? 'translate-x-0' : '-translate-x-full'}
        `}>
            {selectedNode && selectedNode.type === 'docNode' && (
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-blue-600 rounded-lg"><Bot size={20} /></div>
                             <h3 className="font-bold text-lg text-white tracking-widest">COPILOTO IA</h3>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <p className="text-xs text-slate-400 mb-2">Análise do Documento:</p>
                        <h4 className="font-bold text-slate-100 mb-4 truncate">{selectedNode.data.doc.name}</h4>
                        
                        <div className="space-y-4">
                             {nodeIssues.length > 0 && (
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <h5 className="text-sm font-bold text-amber-400 mb-2">Apontamentos do Auditor:</h5>
                                    <div className="space-y-2">
                                        {nodeIssues.map((issue, i) => (
                                            <div key={i} className={`flex gap-2 text-xs p-2 rounded ${issue.severity === 'error' ? 'bg-red-900/30' : 'bg-amber-900/30'}`}>
                                                <AlertTriangle size={14} className={issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}/>
                                                <p className={issue.severity === 'error' ? 'text-red-300' : 'text-amber-300'}>{issue.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             )}
                              <div className="bg-slate-800 p-4 rounded-lg">
                                <h5 className="text-sm font-bold text-cyan-400 mb-2">Sugestão da IA:</h5>
                                <p className="text-xs text-slate-300">
                                    {selectedNode.data.doc.operation_type === 'entry' 
                                    ? "Este documento de entrada representa um potencial de crédito. Verifique se os itens foram classificados com CST entre 50-66 para maximizar a economia de PIS/COFINS."
                                    : "Este documento de saída gera débitos de PIS/COFINS e ICMS. Confirme se as alíquotas estão corretas para evitar recolhimento a maior."
                                    }
                                </p>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- HEADER & ACTIONS --- */}
        <div className="absolute top-6 right-6 z-20 flex flex-col md:flex-row gap-2">
            <button 
                onClick={() => setIsAuditorMode(!isAuditorMode)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm shadow-xl transition-all duration-300 border backdrop-blur-md uppercase tracking-wide ${
                    isAuditorMode 
                    ? 'bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse' 
                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-500'
                }`}
            >
                <ShieldCheck size={18} />
                <span>{isAuditorMode ? 'AUDITOR: ON' : 'SCANNER'}</span>
            </button>
            <button 
                onClick={onExit}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-950/50 border border-red-900/50 text-red-400 rounded-lg font-bold text-sm shadow-xl hover:bg-red-900/80 hover:text-white transition-all backdrop-blur-md uppercase tracking-wide"
            >
                <LogOut size={18} />
            </button>
        </div>

        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
        >
            <Background color="#334155" gap={30} size={2} variant={BackgroundVariant.Dots} />
            <MiniMap className="hidden md:block" nodeColor="#312e81" maskColor="rgba(2, 6, 23, 0.9)" style={{ backgroundColor: '#020617', border: '1px solid #1e293b' }} />
            <Controls className="hidden md:flex" />
        </ReactFlow>
    </div>
  );
};