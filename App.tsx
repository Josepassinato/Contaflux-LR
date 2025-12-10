import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { TaxCalculator } from './pages/TaxCalculator';
import { AIAssistant } from './pages/AIAssistant';
import { Documents } from './pages/Documents';
import { Obligations } from './pages/Obligations';
import { Login } from './pages/Login';
import { Companies } from './pages/Companies';
import { InteractiveMap } from './pages/InteractiveMap';
import { Database, Loader2, X, Trash2, AlertTriangle, PlusCircle, Menu, Lock } from 'lucide-react';
import { Company, FiscalDocument, Obligation, SystemLog, AILearning } from './types';
import { companyService, documentService, logService, obligationService, supabase, aiLearningService } from './services/supabaseClient';
import { mockCompany, mockDocuments, mockLogs } from './services/mockData';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({ name: '', cnpj: '', regime: 'Lucro Real', cnae_principal: '', tax_profile: { isMonofasico: false } });
  const [dataVersion, setDataVersion] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if(session) setSession(session);
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && !isDemoMode) {
      fetchCompanies();
    } else if (!session && !isDemoMode) {
      // Clear data if logged out
      setCompanies([]);
      setSelectedCompanyId('');
    }
  }, [session, isDemoMode]);
  
  useEffect(() => {
    if (isDemoMode) return; // Mock data is loaded once and is static
    
    if (selectedCompanyId && session) {
      fetchCompanyData(selectedCompanyId);
    } else {
      setDocuments([]);
      setObligations([]);
      setLogs([]);
    }
  }, [selectedCompanyId, dataVersion, session, isDemoMode]);

  useEffect(() => {
    if (documents.length > 0 && selectedCompanyId) {
      generateObligationsFromDocs();
    }
  }, [documents, selectedCompanyId]);

  const loadMockData = () => {
    setIsLoading(true);
    setCompanies([mockCompany]);
    setSelectedCompanyId(mockCompany.id);
    setDocuments(mockDocuments);
    setLogs(mockLogs);
    // Directly pass mock data to avoid race conditions with state
    generateObligationsFromDocs(mockDocuments, mockCompany.id, true); 
    setIsLoading(false);
  };

  const handleLoginSuccess = (session: any, isDemo: boolean) => {
    if(isDemo) {
      setIsDemoMode(true);
      loadMockData();
      setSession({ demo: true }); // Set a dummy session object for demo mode
    } else {
      setIsDemoMode(false);
      setSession(session);
    }
  };

  const fetchCompanies = async () => {
    if (isDemoMode) return;
    try {
      setIsLoading(true);
      const data = await companyService.list();
      setCompanies(data);
      if (data.length > 0 && !companies.some(c => c.id === selectedCompanyId)) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (error) { console.error("Supabase Error (Companies):", error); } 
    finally { setIsLoading(false); }
  };

  const fetchCompanyData = async (companyId: string) => {
    if (isDemoMode) return;
    try {
      setIsLoading(true);
      const [docsData, logsData, obligationsData] = await Promise.all([
        documentService.listByCompany(companyId),
        logService.list(companyId),
        obligationService.list(companyId)
      ]);
      setDocuments(docsData);
      setLogs(logsData);
      setObligations(obligationsData);
    } catch (error) { console.error("Supabase Error (Data):", error); }
    finally { setIsLoading(false); }
  };

  const generateObligationsFromDocs = async (docs: FiscalDocument[] = documents, companyId: string = selectedCompanyId, isMock: boolean = isDemoMode) => {
      const existingCompetences = new Set(obligations.map(o => o.competence));
      const competences = new Set<string>(docs.map(d => d.date.substring(0, 7).replace('-', '/')));
      
      const newObligations: Obligation[] = [];
      competences.forEach((comp) => {
          if (!existingCompetences.has(comp)) {
              const baseId = `sped-${comp.replace('/', '-')}-${companyId}`;
              newObligations.push({ id: baseId, company_id: companyId, name: 'SPED Fiscal (ICMS/IPI)', deadline: '', status: 'pending', competence: comp });
              newObligations.push({ id: `efd-${baseId}`, company_id: companyId, name: 'EFD Contribuições', deadline: '', status: 'pending', competence: comp });
          }
      });

      if (newObligations.length > 0) {
          if (!isMock) {
            for(const ob of newObligations) {
              await obligationService.upsert(ob);
            }
          }
          setObligations(prev => [...prev, ...newObligations]);
      }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsDemoMode(false);
    setCurrentPage('dashboard');
    // Clear all states
    setCompanies([]);
    setSelectedCompanyId('');
    setDocuments([]);
    setObligations([]);
    setLogs([]);
  };
  
  const addLog = async (action: string, details: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (!selectedCompanyId) return;
    const newLog: SystemLog = { id: Date.now().toString(), company_id: selectedCompanyId, action, details, timestamp: new Date().toISOString(), type };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep log size manageable
    if (!isDemoMode) await logService.create(newLog);
  };
  
  const handleCreateCompany = async () => {
    if (!newCompanyForm.name || !newCompanyForm.cnpj) {
        alert("Nome e CNPJ são obrigatórios.");
        return;
    }
    try {
        // FIX: Explicitly type the payload to match the expected service type, resolving the `status` type error.
        const companyPayload: Omit<Company, 'id' | 'created_at'> = {
            name: newCompanyForm.name,
            cnpj: newCompanyForm.cnpj,
            regime: 'Lucro Real',
            status: 'active',
            cnae_principal: newCompanyForm.cnae_principal,
            tax_profile: newCompanyForm.tax_profile
        };
        const newCompany = await companyService.create(companyPayload);
        setIsNewCompanyModalOpen(false);
        setNewCompanyForm({ name: '', cnpj: '', regime: 'Lucro Real', cnae_principal: '', tax_profile: { isMonofasico: false } });
        addLog('Empresa Criada', `A empresa ${newCompanyForm.name} foi adicionada.`, 'success');
        await fetchCompanies(); // Refresh company list
        setSelectedCompanyId(newCompany.id); // Select the new company
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao criar a empresa.";
        addLog('Erro ao Criar Empresa', errorMessage, 'error');
        alert(`Erro: ${errorMessage}`);
    }
  };

  const handleResetCompanyData = async () => {
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    if (!selectedCompanyId || !selectedCompany) {
        alert("Nenhuma empresa selecionada para resetar.");
        return;
    }
    if (!window.confirm(`Você tem certeza que quer apagar TODOS os dados da empresa ${selectedCompany.name}? Esta ação é irreversível.`)) {
        return;
    }
    try {
        await documentService.deleteAllFromCompany(selectedCompanyId);
        addLog('Reset de Dados', `Todos os dados da empresa ${selectedCompany.name} foram apagados.`, 'warning');
        setIsSettingsModalOpen(false);
        setDataVersion(v => v + 1); // Force data refresh for the current view
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao resetar os dados.";
        addLog('Erro no Reset', errorMessage, 'error');
        alert(`Erro: ${errorMessage}`);
    }
  };
  
  const handleAddLearning = async (learning: Omit<AILearning, 'id' | 'created_at'>) => {
    try {
      await aiLearningService.create(learning);
      addLog(
        'IA - Aprendizado Supervisionado',
        `Nova regra de correção foi salva: ${learning.justification}`,
        'success'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      addLog('Erro ao Salvar Aprendizado', errorMessage, 'error');
    }
  };

  if (isLoading && !session && !isDemoMode) {
    return <div className="flex h-screen w-screen items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-white" /></div>;
  }
  if (!session && !isDemoMode) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }
  
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const isFullScreenPage = currentPage === 'interactive-map';

  if (isFullScreenPage && selectedCompany) {
    return <InteractiveMap key={`${selectedCompanyId}-${dataVersion}`} documents={documents} company={selectedCompany} onExit={() => setCurrentPage('dashboard')} />;
  }

  const renderContent = () => {
    if (isLoading) {
       return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
    }
    if (!selectedCompany) return (
       <div className="text-center mt-20 text-slate-500 p-4">
         <Database size={48} className="mx-auto mb-4 text-slate-300"/>
         <h2 className="text-xl font-semibold">Nenhuma empresa selecionada</h2>
         <p>Crie uma empresa para começar ou verifique a conexão com o banco de dados.</p>
         <button onClick={() => setIsNewCompanyModalOpen(true)} className="mt-4 text-blue-600 font-medium hover:underline">Criar Empresa</button>
       </div>
    );
    switch (currentPage) {
        case 'dashboard': return <Dashboard company={selectedCompany} logs={logs} documents={documents} obligations={obligations} />;
        case 'calculator': return <TaxCalculator key={`${selectedCompanyId}-${dataVersion}`} company={selectedCompany} isDemoMode={isDemoMode} companyDocuments={documents} onCalculateLog={(msg) => addLog('Apuração Fiscal', msg, 'success')} />;
        case 'assistant': return <AIAssistant company={selectedCompany} isDemoMode={isDemoMode} />;
        case 'documents': return <Documents key={`${selectedCompanyId}-${dataVersion}`} companyId={selectedCompanyId} documents={documents} onUploadSuccess={() => setDataVersion(v => v + 1)} onAddLearning={handleAddLearning} />;
        case 'reports': return <Obligations key={`${selectedCompanyId}-${dataVersion}`} company={selectedCompany} obligations={obligations} setObligations={setObligations} documents={documents} onLog={(a, d) => addLog(a, d)} />;
        case 'companies': return <Companies companies={companies} onRefresh={fetchCompanies} selectedCompanyId={selectedCompanyId} onSelectCompany={setSelectedCompanyId} />;
        default: return <div>Página não encontrada</div>;
    }
  }

  return (
    <div className={`flex min-h-screen font-sans bg-slate-50 text-slate-900 ${isFullScreenPage ? 'bg-slate-950' : ''}`}>
      {!isFullScreenPage && (
          <Sidebar 
              currentPage={currentPage} 
              onNavigate={setCurrentPage} 
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              onSelectCompany={setSelectedCompanyId}
              onAddCompany={() => setIsNewCompanyModalOpen(true)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onLogout={handleLogout}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
      )}
      
      <main className={`flex-1 flex flex-col transition-all duration-300 ${!isFullScreenPage ? 'lg:ml-64' : 'ml-0'}`}>
        {!isFullScreenPage && (
          <header className="lg:hidden sticky top-0 bg-white/80 backdrop-blur-sm p-4 border-b border-slate-100 z-30 flex items-center justify-between">
              <span className="font-bold text-lg text-slate-800">ContaFlux LR</span>
              <button onClick={() => setIsSidebarOpen(true)}><Menu /></button>
          </header>
        )}
        <div className={`p-4 md:p-8 flex-1 overflow-y-auto ${isFullScreenPage ? 'p-0 overflow-hidden' : ''}`}>
          {renderContent()}
        </div>
      </main>

      {isNewCompanyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><PlusCircle size={18} /> Cadastrar Nova Empresa</h3>
                    <button onClick={() => setIsNewCompanyModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <input type="text" placeholder="Nome da Empresa" value={newCompanyForm.name} onChange={e => setNewCompanyForm({...newCompanyForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                    <input type="text" placeholder="CNPJ" value={newCompanyForm.cnpj} onChange={e => setNewCompanyForm({...newCompanyForm, cnpj: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                    <input type="text" placeholder="CNAE Principal" value={newCompanyForm.cnae_principal} onChange={e => setNewCompanyForm({...newCompanyForm, cnae_principal: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" />
                    <div className="flex items-center gap-2">
                       <input type="checkbox" id="isMonofasico" checked={newCompanyForm.tax_profile.isMonofasico} onChange={e => setNewCompanyForm({...newCompanyForm, tax_profile: { isMonofasico: e.target.checked }})} />
                       <label htmlFor="isMonofasico" className="text-sm text-slate-600">Regime Monofásico de PIS/COFINS</label>
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            value="Lucro Real" 
                            disabled 
                            className="w-full p-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed" 
                        />
                        <div className="absolute right-3 top-2.5 flex items-center gap-1 text-xs text-slate-400 font-bold">
                            <Lock size={12} /> PADRÃO
                        </div>
                    </div>
                    <button onClick={handleCreateCompany} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Adicionar Empresa</button>
                </div>
            </div>
        </div>
      )}

      {isSettingsModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold">Configurações</h3>
                      <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="p-6">
                      {selectedCompany ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <h4 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle /> Zona de Perigo</h4>
                              <p className="text-red-700 text-sm mt-2 mb-4">A ação abaixo é irreversível e apagará todos os documentos e apurações da empresa <span className="font-bold">{selectedCompany.name}</span>.</p>
                              <button onClick={handleResetCompanyData} className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 flex justify-center items-center gap-2">
                                  <Trash2 size={16} /> Zerar Dados da Empresa
                              </button>
                          </div>
                      ) : (
                          <p className="text-slate-500 text-center">Selecione uma empresa para ver as configurações disponíveis.</p>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
