import React from 'react';
import { LayoutDashboard, Building2, Calculator, FileText, MessageSquareText, Settings, LogOut, FileBarChart, ChevronDown, PlusCircle, Workflow } from 'lucide-react';
import { Company } from '../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  companies: Company[];
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  onAddCompany: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isOpen: boolean; // For mobile
  onClose: () => void; // For mobile
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, companies, selectedCompanyId, onSelectCompany, onAddCompany, onOpenSettings, onLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'calculator', label: 'Apuração Lucro Real', icon: Calculator },
    { id: 'documents', label: 'Gestão SPED/XML', icon: FileText },
    { id: 'interactive-map', label: 'Mapa Fiscal', icon: Workflow },
    { id: 'reports', label: 'Obrigações & SPED', icon: FileBarChart },
    { id: 'assistant', label: 'Assistente Legal IA', icon: MessageSquareText },
  ];

  const currentCompany = companies.find(c => c.id === selectedCompanyId);

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
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">C</div>
              <span className="text-xl font-bold tracking-tight">ContaFlux LR</span>
          </div>
          
          {/* Company Selector */}
          <div className="relative group">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 block">Empresa Ativa</label>
              <div className="w-full bg-slate-800 rounded-lg p-2 flex items-center justify-between cursor-pointer border border-slate-700 hover:border-blue-500 transition-colors">
                  <div className="truncate text-sm font-medium pr-2">
                      {currentCompany?.name || 'Selecione'}
                  </div>
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </div>
              
              {/* Dropdown */}
              <div className="absolute left-0 top-full mt-1 w-full bg-slate-800 rounded-lg shadow-xl border border-slate-700 hidden group-hover:block z-50 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {companies.map(c => (
                          <div 
                              key={c.id} 
                              onClick={() => onSelectCompany(c.id)}
                              className={`p-2 text-sm hover:bg-slate-700 cursor-pointer border-l-2 ${selectedCompanyId === c.id ? 'border-blue-500 text-blue-400 bg-slate-700/50' : 'border-transparent text-slate-300'}`}
                          >
                              <div className="font-medium truncate">{c.name}</div>
                              <div className="text-[10px] text-slate-500">{c.cnpj}</div>
                          </div>
                      ))}
                  </div>
                  <div 
                      onClick={onAddCompany}
                      className="p-2 border-t border-slate-700 text-xs text-blue-400 hover:bg-slate-700 cursor-pointer flex items-center gap-2 font-medium"
                  >
                      <PlusCircle size={14} /> Nova Empresa
                  </div>
              </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
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
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs mb-2">
              <span>Versão MVP 1.5 (Alpha)</span>
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