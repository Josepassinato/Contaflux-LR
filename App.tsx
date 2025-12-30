import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { TaxCalculator } from './pages/TaxCalculator';
import { AIAssistant } from './pages/AIAssistant';
import { Documents } from './pages/Documents';
import { Obligations } from './pages/Obligations';
import { Login } from './pages/Login';
import { Companies } from './pages/Companies';
import { Notifications } from './pages/Notifications';
import { Integrations } from './pages/Integrations';
import { Closings } from './pages/Closings';
import { MappingEditor } from './pages/MappingEditor'; 
import { AuditTrail } from './pages/AuditTrail'; // NEW
import { Database, Loader2, X, Trash2, AlertTriangle, PlusCircle, Lock } from 'lucide-react';
import { Company, FiscalDocument, Obligation, SystemLog, AILearning, AuthenticatedUser, Notification, AuditLog } from './types';
import { companyService, documentService, logService, obligationService, supabase, aiLearningService, notificationService, auditLogService } from './services/supabaseClient';
import { mockCompany, mockDocuments, mockLogs, mockUser, mockNotifications, mockAuditLogs } from './services/mockData';

const InteractiveMap = React.lazy(() => import('./pages/InteractiveMap').then(module => ({ default: module.InteractiveMap })));


const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]); // NEW

  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({ name: '', cnpj: '', regime: 'Lucro Real', cnae_principal: '', tax_profile: { isMonofasico: false } });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if(session) {
        setSession(session);
        setAuthenticatedUser({ id: session.user.id, email: session.user.email || '', name: session.user.email || 'Usuário', role: 'accountant'});
      }
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) {
            setAuthenticatedUser({ id: session.user.id, email: session.user.email || '', name: session.user.email || 'Usuário', role: 'accountant'});
        } else {
            setAuthenticatedUser(null);
        }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && !isDemoMode) {
      fetchCompanies();
    } else if (!session && !isDemoMode) {
      setCompanies([]);
      setSelectedCompanyId('');
    }
  }, [session, isDemoMode]);
  
  const fetchCompanyData = async (companyId: string) => {
    if (isDemoMode) return;
    try {
      setIsLoading(true);
      // Data fetching is now decentralized
    } catch (error) { console.error("Supabase Error (Data):", error); }
    finally { setIsLoading(false); }
  };


  const loadMockData = () => {
    setIsLoading(true);
    setAuthenticatedUser(mockUser);
    setCompanies([mockCompany]);
    setSelectedCompanyId(mockCompany.id);
    setDocuments(mockDocuments);
    setLogs(mockLogs);
    setNotifications(mockNotifications);
    setAuditLogs(mockAuditLogs); // NEW
    setObligations([]); // Clear to generate dynamically
    generateObligationsFromDocs(mockDocuments, mockCompany.id, true); 
    setIsLoading(false);
  };

  const handleLoginSuccess = (sessionData: any, isDemo: boolean) => {
    if(isDemo) {
      setIsDemoMode(true);
      loadMockData();
      setSession({ demo: true }); 
    } else {
      setIsDemoMode(false);
      setSession(sessionData);
      setAuthenticatedUser({ id: sessionData.user.id, email: sessionData.user.email || '', name: sessionData.user.email || 'Usuário', role: 'accountant' });
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
  
  useEffect(() => {
    if (documents.length > 0 && selectedCompanyId) {
      generateObligationsFromDocs(documents, selectedCompanyId, isDemoMode);
    }
  }, [documents, selectedCompanyId, isDemoMode]);


  const generateObligationsFromDocs = async (docs: FiscalDocument[], companyId: string, isMock: boolean) => {
      if (!companyId) return;
      
      const currentObligations = await obligationService.list(companyId);
      const existingCompetences = new Set(currentObligations.map(o => o.competence));
      
      const competencesInDocs = new Set<string>(docs.map(d => d.date.substring(0, 7).replace('-', '/')));
      
      const newObligationsToCreate: Omit<Obligation, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      competencesInDocs.forEach((comp) => {
          if (!existingCompetences.has(comp)) {
              newObligationsToCreate.push({ company_id: companyId, name: 'SPED Fiscal (ICMS/IPI)', deadline: '', status: 'pending', competence: comp });
              newObligationsToCreate.push({ company_id: companyId, name: 'EFD Contribuições', deadline: '', status: 'pending', competence: comp });
          }
      });

      if (newObligationsToCreate.length > 0) {
          for(const ob of newObligationsToCreate) {
            await obligationService.upsert({ ...ob, id: `${ob.name}-${ob.competence}-${ob.company_id}` });
          }
          const allObligations = await obligationService.list(companyId);
          setObligations(allObligations);
      } else {
        setObligations(currentObligations);
      }
  };

  const handleLogout = async () => { /* ... (código existente sem alterações) ... */ };
  
  const addLog = async (action: string, details: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => { /* ... */ };
  
  const handleCreateCompany = async () => { /* ... */ };

  const handleResetCompanyData = async () => { /* ... */ };
  
  const handleAddLearning = async (learning: Omit<AILearning, 'id' | 'created_at'>, reason: string) => {
    if (!authenticatedUser) return;
    try {
      await aiLearningService.create(learning, authenticatedUser, reason);
      addLog('IA Treinada', `Nova regra de aprendizado criada: ${reason}`, 'success');
    } catch(e) {
      console.error(e);
      addLog('Erro IA', 'Falha ao salvar aprendizado', 'error');
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

  if (isFullScreenPage && selectedCompany && authenticatedUser) {
    return (
        <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-white" /></div>}>
            <InteractiveMap documents={documents} company={selectedCompany} onExit={() => setCurrentPage('dashboard')} />
        </Suspense>
    );
  }

  const renderContent = () => {
    if (!selectedCompany || !authenticatedUser) return (
       <div className="text-center mt-20 text-slate-500 p-4">
         <Database size={48} className="mx-auto mb-4 text-slate-300"/>
         <h2 className="text-xl font-semibold">Nenhuma empresa selecionada</h2>
         <p>Crie uma nova empresa para começar a trabalhar.</p>
         <button onClick={() => setIsNewCompanyModalOpen(true)} className="mt-4 text-blue-600 font-medium hover:underline">Criar Empresa</button>
       </div>
    );
    switch (currentPage) {
        case 'dashboard': return <Dashboard company={selectedCompany} logs={logs} documents={documents} obligations={obligations} />;
        case 'calculator': return <TaxCalculator user={authenticatedUser} company={selectedCompany} isDemoMode={isDemoMode} companyDocuments={documents} onCalculateLog={(msg) => addLog('Apuração Fiscal', msg, 'success')} />;
        case 'assistant': return <AIAssistant user={authenticatedUser} company={selectedCompany} isDemoMode={isDemoMode} />;
        case 'documents': return <Documents user={authenticatedUser} companyId={selectedCompanyId} documents={documents} onUploadSuccess={() => generateObligationsFromDocs(documents, selectedCompanyId, isDemoMode)} onAddLearning={handleAddLearning} />;
        case 'reports': return <Obligations company={selectedCompany} obligations={obligations} setObligations={setObligations} documents={documents} onLog={(a, d) => addLog(a, d)} />;
        case 'companies': return <Companies user={authenticatedUser} companies={companies} onRefresh={fetchCompanies} selectedCompanyId={selectedCompanyId} onSelectCompany={setSelectedCompanyId} />;
        case 'notifications': return <Notifications notifications={notifications} setNotifications={setNotifications} />;
        case 'integrations': return <Integrations company={selectedCompany} onCompanyUpdate={fetchCompanies} />;
        case 'closings': return <Closings />;
        case 'mapping-editor': return <MappingEditor />;
        case 'audit-trail': return <AuditTrail companyId={selectedCompanyId} />; // NEW
        default: return <div>Página não encontrada</div>;
    }
  }

  return (
    <div className={`flex min-h-screen font-sans bg-slate-50 text-slate-900 ${isFullScreenPage ? 'bg-slate-950' : ''}`}>
      {!isFullScreenPage && authenticatedUser && (
          <Sidebar 
              user={authenticatedUser}
              currentPage={currentPage} 
              onNavigate={setCurrentPage} 
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onLogout={handleLogout}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
      )}
      
      <main className={`flex-1 flex flex-col transition-all duration-300 ${!isFullScreenPage ? 'lg:ml-64' : 'ml-0'}`}>
        {!isFullScreenPage && authenticatedUser && (
          <Header
            user={authenticatedUser}
            companies={companies}
            selectedCompany={selectedCompany}
            notifications={notifications}
            onSelectCompany={setSelectedCompanyId}
            onAddCompany={() => setIsNewCompanyModalOpen(true)}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onNavigate={setCurrentPage}
          />
        )}
        <div className={`p-4 md:p-8 flex-1 overflow-y-auto ${isFullScreenPage ? 'p-0 overflow-hidden' : ''}`}>
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}>
            {renderContent()}
          </Suspense>
        </div>
      </main>

      {isNewCompanyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          {/* ... (código do modal sem alterações) ... */}
        </div>
      )}

      {isSettingsModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             {/* ... (código do modal sem alterações) ... */}
          </div>
      )}
    </div>
  );
};

export default App;