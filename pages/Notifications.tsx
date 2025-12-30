import React from 'react';
import { Notification } from '../types';
import { Bell, AlertTriangle, CheckCircle2, Lightbulb, X, Info } from 'lucide-react';
import { notificationService } from '../services/supabaseClient';

interface NotificationsProps {
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export const Notifications: React.FC<NotificationsProps> = ({ notifications, setNotifications }) => {

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await notificationService.markAsRead(id);
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'error': return <AlertTriangle className="text-red-500" />;
            case 'success': return <CheckCircle2 className="text-emerald-500" />;
            case 'recommendation': return <Lightbulb className="text-blue-500" />;
            case 'info':
            default: return <Info className="text-slate-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Bell className="text-blue-600" />
                    Central de Notificações
                </h1>
                <p className="text-slate-500">Alertas e recomendações dos pipelines automáticos da IA.</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 max-w-4xl mx-auto">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-700">Hoje</h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                        <p className="p-8 text-center text-slate-400 italic">Nenhuma notificação encontrada.</p>
                    ) : (
                        notifications.map(notification => (
                            <div 
                                key={notification.id} 
                                className={`p-4 flex gap-4 transition-colors hover:bg-slate-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}
                            >
                                <div className="mt-1">{getIcon(notification.type)}</div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800">{notification.title}</h3>
                                        {!notification.is_read && (
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                                <button onClick={() => handleMarkAsRead(notification.id)} className="text-xs text-slate-400 hover:text-slate-600" title="Marcar como lida">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{notification.description}</p>
                                    <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                                        <span>{new Date(notification.timestamp).toLocaleString('pt-BR')}</span>
                                        {notification.link_to && (
                                            <a href="#" className="font-medium text-blue-600 hover:underline">Ver Detalhes</a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
