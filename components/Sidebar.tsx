import React from 'react';
import { LayoutDashboard, Building2, Calculator, FileText, MessageSquareText, Settings, LogOut, FileBarChart, Workflow, Bot, Link, GitBranch, BookMarked, ShieldCheck } from 'lucide-react';
import { AuthenticatedUser } from '../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isOpen: boolean; 
  onClose: () => void; 
  user: AuthenticatedUser | null;
}

const ALL_MENU_ITEMS = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, roles: ['admin', 'accountant', 'employee'] },
  { id: 'companies', label: 'Empresas', icon: Building2, roles: ['admin', 'accountant'] },
  { id: 'calculator', label: 'Apuração Lucro Real', icon: Calculator, roles: ['admin', 'accountant'] },
  { id: 'documents', label: 'Gestão SPED/XML', icon: FileText, roles: ['admin', 'accountant', 'employee'] },
  { id: 'interactive-map', label: 'Mapa Fiscal', icon: Workflow, roles: ['admin', 'accountant'] },
  { id: 'reports', label: 'Obrigações & SPED', icon: FileBarChart, roles: ['admin', 'accountant'] },
  { id: 'mapping-editor', label: 'Mapeamento Fiscal', icon: BookMarked, roles: ['admin', 'accountant'] },
  { id: 'assistant', label: 'Assistente Legal IA', icon: MessageSquareText, roles: ['admin', 'accountant', 'employee'] },
];

const AUTOMATION_MENU_ITEMS = [
    { id: 'integrations', label: 'Integrações', icon: Link, roles: ['admin', 'accountant'] },
    { id: 'closings', label: 'Fechamentos', icon: GitBranch, roles: ['admin', 'accountant']},
];

const ADMIN_MENU_ITEMS = [
    { id: 'audit-trail', label: 'Trilha de Auditoria', icon: ShieldCheck, roles: ['admin', 'accountant']},
]

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, onOpenSettings, onLogout, isOpen, onClose, user }) => {
  
  const userRole = user?.role || 'employee';
  const menuItems = ALL_MENU_ITEMS.filter(item => item.roles.includes(userRole));
  const automationItems = AUTOMATION_MENU_ITEMS.filter(item => item.roles.includes(userRole));
  const adminItems = ADMIN_MENU_ITEMS.filter(item => item.roles.includes(userRole));


  const handleNavigation = (page: string) => {
    onNavigate(page);
    onClose(); // Close sidebar on mobile after navigation
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />}

      <div className={`h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 shadow-xl z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-700 h-[88px] flex items-center">
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">C</div>
              <span className="text-xl font-bold tracking-tight">ContaFlux LR</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          
          {automationItems.length > 0 && (
            <div className="mt-6 px-3">
                <h3 className="px-4 mb-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">Automação</h3>
                <ul className="space-y-1">
                 {automationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                        <li key={item.id}>
                        <button
                            onClick={() => handleNavigation(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                            isActive
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                        </li>
                    );
                    })}
                </ul>
            </div>
          )}

          {adminItems.length > 0 && (
            <div className="mt-6 px-3">
                <h3 className="px-4 mb-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">Governança</h3>
                <ul className="space-y-1">
                 {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                        <li key={item.id}>
                        <button
                            onClick={() => handleNavigation(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                            isActive
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                        </li>
                    );
                    })}
                </ul>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs mb-2">
              <div className="truncate">
                <p className="font-bold text-slate-300">{user?.name}</p>
                <p className="text-slate-400 capitalize">{user?.role}</p>
              </div>
          </div>
          <button 
            onClick={onOpenSettings}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white w-full transition-colors"
          >
            <Settings size={20} />
            <span className="text-sm font-medium">Configurações</span>
          </button>
          <button 
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 w-full transition-colors mt-1"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};
