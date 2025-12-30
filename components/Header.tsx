import React, { useState } from 'react';
import { Company, AuthenticatedUser, Notification } from '../types';
import { ChevronDown, PlusCircle, Bell, Menu } from 'lucide-react';

interface HeaderProps {
    user: AuthenticatedUser;
    companies: Company[];
    selectedCompany: Company | undefined;
    notifications: Notification[];
    onSelectCompany: (id: string) => void;
    onAddCompany: () => void;
    onToggleSidebar: () => void;
    onNavigate: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
    user,
    companies,
    selectedCompany,
    notifications,
    onSelectCompany,
    onAddCompany,
    onToggleSidebar,
    onNavigate,
}) => {
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const unreadNotifications = notifications.filter(n => !n.is_read).length;

    return (
        <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-30 flex items-center justify-between h-[88px] px-4 md:px-8 border-b border-slate-100">
            {/* Left side: Hamburger and Company Selector */}
            <div className="flex items-center gap-4">
                <button onClick={onToggleSidebar} className="lg:hidden text-slate-600">
                    <Menu />
                </button>
                
                {/* Company Selector */}
                <div className="relative" onMouseLeave={() => setIsCompanyDropdownOpen(false)}>
                    <div 
                        onMouseEnter={() => setIsCompanyDropdownOpen(true)}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100"
                    >
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
                            {selectedCompany ? selectedCompany.name.charAt(0) : '?'}
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-sm font-bold text-slate-800">{selectedCompany?.name || 'Nenhuma empresa'}</h1>
                            <p className="text-xs text-slate-500">{selectedCompany?.cnpj || 'Selecione ou crie uma empresa'}</p>
                        </div>
                        <ChevronDown size={16} className="text-slate-400 hidden md:block" />
                    </div>

                    {/* Dropdown */}
                    {isCompanyDropdownOpen && (
                        <div 
                            onMouseLeave={() => setIsCompanyDropdownOpen(false)}
                            className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95"
                        >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                {companies.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => { onSelectCompany(c.id); setIsCompanyDropdownOpen(false); }}
                                        className={`p-2 rounded-md text-sm hover:bg-slate-100 cursor-pointer ${selectedCompany?.id === c.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                                    >
                                        <div className="font-medium truncate">{c.name}</div>
                                        <div className="text-xs text-slate-400">{c.cnpj}</div>
                                    </div>
                                ))}
                            </div>
                             {user.role !== 'employee' && (
                              <div 
                                  onClick={() => { onAddCompany(); setIsCompanyDropdownOpen(false); }}
                                  className="p-2 border-t border-slate-100 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-2 font-medium"
                              >
                                  <PlusCircle size={14} /> Nova Empresa
                              </div>
                             )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right side: Notifications and User */}
            <div className="flex items-center gap-4">
                <button onClick={() => onNavigate('notifications')} className="relative text-slate-500 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100">
                    <Bell />
                    {unreadNotifications > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                            {unreadNotifications}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
};
